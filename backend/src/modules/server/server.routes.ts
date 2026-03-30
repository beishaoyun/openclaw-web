import { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { getSql } from '../../database';
import { Client, ConnectConfig } from 'ssh2';

interface AddServerBody {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

// SSH 连接池（简单实现，生产环境应使用连接池库）
const sshConnectionPool = new Map<string, Client>();

// 获取 SSH 连接
async function getSshConnection(server: any): Promise<Client> {
  const cacheKey = `ssh:${server.id}`;

  // 检查是否有现有连接
  const existingConn = sshConnectionPool.get(cacheKey);
  if (existingConn) {
    return existingConn;
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    const config: ConnectConfig = {
      host: server.public_ip,
      port: server.ssh_port || 22,
      username: server.ssh_user,
      password: server.ssh_password,
      readyTimeout: 10000,
      tryKeyboard: true,
    };

    conn.on('ready', () => {
      sshConnectionPool.set(cacheKey, conn);
      resolve(conn);
    }).on('error', (err) => {
      reject(new Error('SSH 连接失败：' + err.message));
    });

    conn.connect(config);
  });
}

// 关闭 SSH 连接
function closeSshConnection(serverId: string) {
  const cacheKey = `ssh:${serverId}`;
  const conn = sshConnectionPool.get(cacheKey);
  if (conn) {
    conn.end();
    sshConnectionPool.delete(cacheKey);
  }
}

// 执行 SSH 命令
async function executeSshCommand(server: any, command: string): Promise<string> {
  const conn = await getSshConnection(server);

  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject(new Error('命令执行失败：' + err.message));
        return;
      }

      let output = '';
      let errorOutput = '';

      stream.on('close', (code: number) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`命令执行失败，退出码：${code}, ${errorOutput}`));
        }
      }).stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      stream.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
    });
  });
}

export async function serverRoutes(app: FastifyInstance) {
  // 列出所有服务器
  app.get('/', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;

      return { data: servers };
    } catch (err) {
      console.error('Failed to list servers:', err);
      return { data: [] };
    }
  });

  // 添加服务器
  app.post('/', { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: AddServerBody }>) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { name, host, port, username, password } = request.body;

    // 验证必填字段
    if (!host) {
      throw new Error('主机地址不能为空');
    }
    if (!username) {
      throw new Error('用户名不能为空');
    }
    if (!password) {
      throw new Error('密码不能为空');
    }

    try {
      const result = await db`
        INSERT INTO servers (user_id, name, public_ip, ssh_port, ssh_user, ssh_password, status, ssh_status, openclaw_status)
        VALUES (${userId}, ${name || null}, ${host}, ${port || 22}, ${username}, ${password}, 'unknown', 'unknown', 'unknown')
        RETURNING *
      `;

      return { data: result[0], message: '服务器添加成功' };
    } catch (err: any) {
      console.error('Failed to add server:', err);
      throw new Error('添加服务器失败：' + err.message);
    }
  });

  // 获取服务器详情
  app.get('/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];

      // 同步进行 SSH 验证（10 秒超时）
      const conn = new Client();
      try {
        await new Promise<void>((resolve, reject) => {
          conn.connect({
            host: server.public_ip,
            port: server.ssh_port || 22,
            username: server.ssh_user,
            password: server.ssh_password,
            readyTimeout: 10000,
          });
          conn.on('ready', () => resolve()).on('error', reject);
        });

        // SSH 连接成功，更新状态
        await db`UPDATE servers SET ssh_status = 'online', updated_at = NOW() WHERE id = ${id}`;
        server.ssh_status = 'online';

        // 检查 OpenClaw 是否安装
        try {
          const versionOutput = await new Promise<string>((resolve, reject) => {
            conn.exec('openclaw -v 2>&1', (err, stream) => {
              if (err) reject(err);
              let output = '';
              stream.on('data', (data) => output += data.toString());
              stream.on('close', () => resolve(output.trim()));
            });
          });

          if (versionOutput.includes('OpenClaw')) {
            await db`UPDATE servers SET openclaw_status = 'installed', updated_at = NOW() WHERE id = ${id}`;
            server.openclaw_status = 'installed';
          } else {
            await db`UPDATE servers SET openclaw_status = 'not_installed', updated_at = NOW() WHERE id = ${id}`;
            server.openclaw_status = 'not_installed';
          }
        } catch (e) {
          // openclaw 命令不存在
          await db`UPDATE servers SET openclaw_status = 'not_installed', updated_at = NOW() WHERE id = ${id}`;
          server.openclaw_status = 'not_installed';
        }

        conn.end();
      } catch (err) {
        // SSH 连接失败
        await db`UPDATE servers SET ssh_status = 'offline', updated_at = NOW() WHERE id = ${id}`;
        await db`UPDATE servers SET openclaw_status = 'unknown', updated_at = NOW() WHERE id = ${id}`;
        server.ssh_status = 'offline';
        server.openclaw_status = 'unknown';
      }

      return { data: server };
    } catch (err: any) {
      console.error('Failed to get server:', err);
      throw new Error('获取服务器失败：' + err.message);
    }
  });

  // 更新服务器
  app.put('/:id', { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: AddServerBody; Params: { id: string } }>) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params;
    const { name, host, port, username, password } = request.body;

    try {
      const result = await db`
        UPDATE servers
        SET name = ${name || null},
            public_ip = ${host},
            ssh_port = ${port || 22},
            ssh_user = ${username},
            ssh_password = ${password},
            updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('服务器不存在或无权限');
      }

      return { data: result[0], message: '服务器更新成功' };
    } catch (err: any) {
      console.error('Failed to update server:', err);
      throw new Error('更新服务器失败：' + err.message);
    }
  });

  // 删除服务器
  app.delete('/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const result = await db`
        DELETE FROM servers
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('服务器不存在或无权限');
      }

      return { message: '服务器删除成功' };
    } catch (err: any) {
      console.error('Failed to delete server:', err);
      throw new Error('删除服务器失败：' + err.message);
    }
  });

  // SSH 连通性测试
  app.post('/:id/ssh-test', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];
      const conn = new Client();

      return new Promise((resolve, reject) => {
        conn.on('ready', () => {
          // 测试成功后获取服务器基本信息
          conn.exec('uname -a', (err, stream) => {
            if (err) {
              conn.end();
              resolve({
                success: true,
                message: `SSH 连接测试成功：${server.ssh_user}@${server.public_ip}:${server.ssh_port}`,
                osInfo: '未知',
              });
              return;
            }

            let osInfo = '';
            stream.on('data', (data: Buffer) => {
              osInfo += data.toString();
            }).on('close', () => {
              conn.end();
              resolve({
                success: true,
                message: `SSH 连接测试成功：${server.ssh_user}@${server.public_ip}:${server.ssh_port}`,
                osInfo: osInfo.trim().split('\n')[0] || '未知',
              });
            });
          });
        }).on('error', (err) => {
          console.error('SSH connection error:', err);
          reject(new Error('SSH 连接失败：' + err.message));
        });

        conn.connect({
          host: server.public_ip,
          port: server.ssh_port || 22,
          username: server.ssh_user,
          password: server.ssh_password,
          readyTimeout: 10000,
          tryKeyboard: true,
        });
      });
    } catch (err: any) {
      console.error('SSH test failed:', err);
      return { success: false, message: 'SSH 连接测试失败：' + err.message };
    }
  });

  // 验证 SSH 账号密码（独立接口）
  app.post('/:id/verify-credentials', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];
      const conn = new Client();

      return new Promise((resolve) => {
        const startTime = Date.now();

        conn.on('ready', () => {
          const duration = Date.now() - startTime;
          // 获取系统信息
          conn.exec('cat /etc/os-release 2>/dev/null || uname -a', (err, stream) => {
            let osInfo = '';
            if (!err) {
              stream.on('data', (data: Buffer) => {
                osInfo += data.toString();
              });
            }
            conn.end();

            resolve({
              success: true,
              verified: true,
              message: '账号密码验证成功',
              responseTime: duration,
              osInfo: osInfo.trim().split('\n').find(line => line.startsWith('PRETTY_NAME'))?.split('=')[1]?.replace(/"/g, '') || osInfo.trim().split('\n')[0] || '未知',
            });
          });
        }).on('error', (err) => {
          conn.end();
          resolve({
            success: false,
            verified: false,
            message: '账号密码验证失败：' + err.message,
            error: err.message,
          });
        });

        conn.connect({
          host: server.public_ip,
          port: server.ssh_port || 22,
          username: server.ssh_user,
          password: server.ssh_password,
          readyTimeout: 10000,
          tryKeyboard: true,
        });
      });
    } catch (err: any) {
      console.error('Credential verification failed:', err);
      return { success: false, verified: false, message: '验证失败：' + err.message };
    }
  });

  // 批量验证所有服务器
  app.post('/batch/verify-all', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE user_id = ${userId}
      `;

      const results = [];
      for (const server of servers) {
        const conn = new Client();
        const result = await new Promise((resolve) => {
          conn.on('ready', () => {
            conn.exec('cat /etc/os-release 2>/dev/null | grep PRETTY_NAME', (err, stream) => {
              let osInfo = '';
              if (!err) {
                stream.on('data', (data: Buffer) => osInfo += data.toString());
              }
              conn.end();
              resolve({
                id: server.id,
                name: server.name,
                success: true,
                osInfo: osInfo.trim().replace('PRETTY_NAME=', '').replace(/"/g, '') || '未知',
              });
            });
          }).on('error', () => {
            conn.end();
            resolve({
              id: server.id,
              name: server.name,
              success: false,
              osInfo: null,
            });
          });

          conn.connect({
            host: server.public_ip,
            port: server.ssh_port || 22,
            username: server.ssh_user,
            password: server.ssh_password,
            readyTimeout: 8000,
            tryKeyboard: true,
          });
        });
        results.push(result);
      }

      // 更新数据库中的 SSH 状态
      for (const result of results) {
        await db`
          UPDATE servers
          SET ssh_status = ${result.success ? 'online' : 'offline'},
              updated_at = NOW()
          WHERE id = ${result.id}
        `;
      }

      return {
        data: results,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      };
    } catch (err: any) {
      console.error('Batch verification failed:', err);
      throw new Error('批量验证失败：' + err.message);
    }
  });

  // 一键重启
  app.post('/:id/reboot', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];

      // 执行重启命令（后台执行，避免连接被中断）
      await executeSshCommand(server, 'nohup sh -c "sleep 2 && reboot" > /dev/null 2>&1 &');

      // 更新服务器状态
      await db`
        UPDATE servers SET status = 'rebooting', updated_at = NOW()
        WHERE id = ${id}
      `;

      return { message: '重启命令已发送，服务器将在 2 分钟后重启' };
    } catch (err: any) {
      console.error('Failed to reboot:', err);
      throw new Error('重启失败：' + err.message);
    }
  });

  // 一键关机
  app.post('/:id/shutdown', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];

      // 执行关机命令
      await executeSshCommand(server, 'shutdown -h now');

      // 更新服务器状态
      await db`
        UPDATE servers SET status = 'shutdown', updated_at = NOW()
        WHERE id = ${id}
      `;

      // 关闭连接池中的连接
      closeSshConnection(id);

      return { message: '关机命令已发送' };
    } catch (err: any) {
      console.error('Failed to shutdown:', err);
      throw new Error('关机失败：' + err.message);
    }
  });

  // 刷新状态
  app.post('/:id/refresh', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];
      let metrics: any = { cpu_usage: 0, memory_usage: 0, disk_usage: 0 };

      try {
        // 获取 CPU 使用率
        const cpuUsage = await executeSshCommand(server, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");

        // 获取内存使用率
        const memInfo = await executeSshCommand(server, "free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100}'");

        // 获取磁盘使用率
        const diskUsage = await executeSshCommand(server, "df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1");

        metrics = {
          cpu_usage: parseFloat(cpuUsage) || 0,
          memory_usage: parseFloat(memInfo) || 0,
          disk_usage: parseFloat(diskUsage) || 0,
        };

        // 更新服务器监控数据
        await db`
          UPDATE servers
          SET cpu_usage = ${metrics.cpu_usage},
              memory_usage = ${metrics.memory_usage},
              disk_usage = ${metrics.disk_usage},
              last_checked_at = NOW(),
              updated_at = NOW()
          WHERE id = ${id}
        `;

        // 记录监控历史
        await db`
          INSERT INTO server_metrics (server_id, cpu_usage, memory_used, memory_total, disk_used, disk_total, load_1m)
          VALUES (
            ${id},
            ${metrics.cpu_usage},
            ${Math.round(metrics.memory_usage * 100)},
            100,
            ${Math.round(metrics.disk_usage * 100)},
            100,
            ${metrics.cpu_usage}
          )
        `;

      } catch (sshErr) {
        console.warn('Failed to get server metrics via SSH:', sshErr);
        // SSH 失败时仅更新时间戳
        await db`
          UPDATE servers SET last_checked_at = NOW(), updated_at = NOW()
          WHERE id = ${id}
        `;
      }

      return {
        data: {
          ...server,
          ...metrics,
        },
        message: '状态已刷新',
      };
    } catch (err: any) {
      console.error('Failed to refresh:', err);
      throw new Error('刷新失败：' + err.message);
    }
  });

  // 批量重启
  app.post('/batch/reboot', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { ids } = request.body as { ids: string[] };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ANY(${ids}) AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('没有找到服务器');
      }

      // 串行执行重启命令（避免并发 SSH 连接过多）
      const results = [];
      for (const server of servers) {
        try {
          await executeSshCommand(server, 'nohup sh -c "sleep 2 && reboot" > /dev/null 2>&1 &');
          results.push({ id: server.id, status: 'success' });

          await db`
            UPDATE servers SET status = 'rebooting', updated_at = NOW()
            WHERE id = ${server.id}
          `;
        } catch (err: any) {
          results.push({ id: server.id, status: 'failed', error: err.message });
        }
      }

      return {
        message: `批量重启完成：${results.filter(r => r.status === 'success').length}/${servers.length} 成功`,
        results,
      };
    } catch (err: any) {
      console.error('Failed to batch reboot:', err);
      throw new Error('批量重启失败：' + err.message);
    }
  });

  // 批量关机
  app.post('/batch/shutdown', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { ids } = request.body as { ids: string[] };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ANY(${ids}) AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('没有找到服务器');
      }

      // 串行执行关机命令
      const results = [];
      for (const server of servers) {
        try {
          await executeSshCommand(server, 'shutdown -h now');
          results.push({ id: server.id, status: 'success' });

          await db`
            UPDATE servers SET status = 'shutdown', updated_at = NOW()
            WHERE id = ${server.id}
          `;

          closeSshConnection(server.id);
        } catch (err: any) {
          results.push({ id: server.id, status: 'failed', error: err.message });
        }
      }

      return {
        message: `批量关机完成：${results.filter(r => r.status === 'success').length}/${servers.length} 成功`,
        results,
      };
    } catch (err: any) {
      console.error('Failed to batch shutdown:', err);
      throw new Error('批量关机失败：' + err.message);
    }
  });

  // 获取监控数据
  app.get('/:id/metrics', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const servers = await db`
        SELECT cpu_usage, memory_usage, disk_usage FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];
      return {
        cpu: parseFloat(server.cpu_usage) || 0,
        memory: parseFloat(server.memory_usage) || 0,
        disk: parseFloat(server.disk_usage) || 0
      };
    } catch (err: any) {
      console.error('Failed to get metrics:', err);
      throw new Error('获取监控数据失败：' + err.message);
    }
  });

  // 执行 SSH 命令
  app.post('/:id/execute', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { command } = request.body as { command: string };

    try {
      const servers = await db`
        SELECT * FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];
      const result = await executeSshCommand(server, command);

      return { data: result, message: '命令执行成功' };
    } catch (err: any) {
      console.error('Failed to execute command:', err);
      throw new Error('命令执行失败：' + err.message);
    }
  });
}
