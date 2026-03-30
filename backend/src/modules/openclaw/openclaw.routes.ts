import { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { getSql } from '../../database';
import { Client } from 'ssh2';

interface InstallRequest {
  server_id: string;
  install_method?: 'online' | 'offline';
  version?: string;
}

// 安装步骤定义
const INSTALL_STEPS = [
  '检查服务器环境',
  '下载 OpenClaw 安装包',
  '解压并安装依赖',
  '生成配置文件',
  '启动服务',
  '验证安装'
];

// 系统兼容性要求
const SYSTEM_REQUIREMENTS = {
  minGlibcVersion: '2.28',
  supportedSystems: [
    { name: 'CentOS Stream 8', ids: ['centos-stream-8', 'centos-stream-9'], recommended: true },
    { name: 'CentOS Stream 9', ids: ['centos-stream-8', 'centos-stream-9'], recommended: true },
    { name: 'RHEL 8.9+', ids: ['rhel-8', 'rhel-9'], recommended: true },
    { name: 'RHEL 9.x', ids: ['rhel-8', 'rhel-9'], recommended: true },
    { name: 'Rocky Linux 8', ids: ['rocky-8', 'rocky-9'], recommended: false },
    { name: 'Rocky Linux 9', ids: ['rocky-8', 'rocky-9'], recommended: false },
    { name: 'AlmaLinux 8', ids: ['almalinux-8', 'almalinux-9'], recommended: false },
    { name: 'AlmaLinux 9', ids: ['almalinux-8', 'almalinux-9'], recommended: false },
    { name: 'Debian 11', ids: ['debian-11', 'debian-12'], recommended: false },
    { name: 'Debian 12', ids: ['debian-11', 'debian-12'], recommended: false },
    { name: 'Ubuntu 20.04 LTS', ids: ['ubuntu-20', 'ubuntu-22', 'ubuntu-24'], recommended: false },
    { name: 'Ubuntu 22.04 LTS', ids: ['ubuntu-20', 'ubuntu-22', 'ubuntu-24'], recommended: false },
    { name: 'Ubuntu 24.04 LTS', ids: ['ubuntu-20', 'ubuntu-22', 'ubuntu-24'], recommended: false },
  ],
};

// WebSocket 连接存储（生产环境应使用 Redis）
const wsConnections = new Map<string, any[]>();
// 安装任务状态存储（生产环境应使用 Redis）
const installTaskStatus = new Map<string, { step: number; logs: string[]; status: string; error?: string }>();

// 推送安装进度到 WebSocket
function pushInstallProgress(taskId: string, step: number, logs: string[], status: string) {
  const clients = wsConnections.get(taskId) || [];
  const message = JSON.stringify({ type: 'progress', step, logs, status });
  clients.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  });
  // 同时保存到内存状态
  installTaskStatus.set(taskId, { step, logs, status });
}

// 解析 Node.js 版本号
function parseVersion(version: string): number[] {
  return version.replace('v', '').split('.').map(Number);
}

// 比较版本号
function isVersionGte(version: string, minVersion: string): boolean {
  const v1 = parseVersion(version);
  const v2 = parseVersion(minVersion);
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const a = v1[i] || 0;
    const b = v2[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}

// 解析 glibc 版本号
function parseGlibcVersion(output: string): string {
  // ldd --version 输出通常是 "ldd (GNU libc) 2.28" 或类似格式
  const match = output.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : '0';
}

// 解析系统 ID（用于匹配推荐系统）
function parseSystemId(osInfo: string): string {
  const osLower = osInfo.toLowerCase();
  if (osLower.includes('centos') || osLower.includes('centos-stream')) {
    if (osLower.includes('stream 8') || osLower.includes('stream-8') || osLower.includes('stream_8')) return 'centos-stream-8';
    if (osLower.includes('stream 9') || osLower.includes('stream-9') || osLower.includes('stream_9')) return 'centos-stream-9';
    if (osLower.includes('centos 8')) return 'centos-stream-8';
    if (osLower.includes('centos 9')) return 'centos-stream-9';
    return 'centos-7';
  }
  if (osLower.includes('rhel') || osLower.includes('red hat')) {
    if (osLower.includes('8')) return 'rhel-8';
    if (osLower.includes('9')) return 'rhel-9';
    return 'rhel-7';
  }
  if (osLower.includes('rocky')) {
    if (osLower.includes('8')) return 'rocky-8';
    if (osLower.includes('9')) return 'rocky-9';
    return 'rocky';
  }
  if (osLower.includes('almalinux') || osLower.includes('alma')) {
    if (osLower.includes('8')) return 'almalinux-8';
    if (osLower.includes('9')) return 'almalinux-9';
    return 'almalinux';
  }
  if (osLower.includes('debian')) {
    const match = osLower.match(/debian.*?(\d+)/);
    if (match) return `debian-${match[1]}`;
    return 'debian';
  }
  if (osLower.includes('ubuntu')) {
    const match = osLower.match(/ubuntu.*?(\d+\.\d+)/);
    if (match) return `ubuntu-${match[1].replace('.', '')}`;
    return 'ubuntu';
  }
  return 'unknown';
}

// 检查系统兼容性（包含 glibc 检查）
function checkSystemCompatibility(osInfo: string, glibcVersion: string): { compatible: boolean; message: string; osDetected: string; recommendedSystems?: string } {
  const osDetected = osInfo.split('\n')[0] || 'Unknown';
  const systemId = parseSystemId(osInfo);

  // 检查 glibc 版本
  if (!isVersionGte(glibcVersion, SYSTEM_REQUIREMENTS.minGlibcVersion)) {
    // 构建推荐系统列表
    const recommended = SYSTEM_REQUIREMENTS.supportedSystems
      .filter(s => s.recommended)
      .map(s => s.name)
      .join(', ');
    const allSupported = SYSTEM_REQUIREMENTS.supportedSystems
      .map(s => `  - ${s.name}`)
      .join('\n');

    return {
      compatible: false,
      message: `不支持的系统：${osDetected}。glibc 版本 ${glibcVersion} 过低，需要 glibc >= ${SYSTEM_REQUIREMENTS.minGlibcVersion}。\n\n推荐使用以下系统：\n${recommended}\n\n完整支持列表：\n${allSupported}`,
      osDetected,
      recommendedSystems: recommended,
    };
  }

  return {
    compatible: true,
    message: '系统兼容性检查通过',
    osDetected,
  };
}

export async function openclawRoutes(app: FastifyInstance) {
  // WebSocket 连接
  app.get('/ws/:taskId', { websocket: true }, async (connection) => {
    const { taskId } = connection.params as { taskId: string };

    if (!wsConnections.has(taskId)) {
      wsConnections.set(taskId, []);
    }
    wsConnections.get(taskId)?.push(connection.socket);

    connection.socket.on('close', () => {
      const clients = wsConnections.get(taskId) || [];
      const index = clients.indexOf(connection.socket);
      if (index > -1) {
        clients.splice(index, 1);
      }
    });
  });

  // 开始安装
  app.post('/install', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { server_id, install_method = 'online', version = 'latest' } = request.body as InstallRequest;

    if (!server_id) {
      throw new Error('服务器 ID 不能为空');
    }

    // 验证服务器是否存在
    const servers = await db`
      SELECT * FROM servers
      WHERE id = ${server_id} AND user_id = ${userId}
    `;

    if (servers.length === 0) {
      throw new Error('服务器不存在');
    }

    const server = servers[0];

    // 先进行环境检测
    const conn = new Client();
    try {
      await new Promise<void>((resolve, reject) => {
        conn.connect({
          host: server.public_ip,
          port: server.ssh_port || 22,
          username: server.ssh_user,
          password: server.ssh_password,
          readyTimeout: 15000,
        });
        conn.on('ready', () => resolve()).on('error', reject);
      });

      // 获取系统信息
      const osInfo = await new Promise<string>((resolve, reject) => {
        conn.exec('cat /etc/os-release 2>/dev/null || uname -a', (err, stream) => {
          if (err) reject(err);
          let output = '';
          stream.on('data', (data) => output += data.toString());
          stream.on('close', () => resolve(output.trim()));
        });
      });

      // 检查 glibc 版本
      let glibcVersion = '';
      try {
        glibcVersion = await new Promise<string>((resolve, reject) => {
          conn.exec('ldd --version 2>&1 | head -n1', (err, stream) => {
            if (err) reject(err);
            let output = '';
            stream.on('data', (data) => output += data.toString());
            stream.on('close', () => resolve(output.trim()));
          });
        });
        glibcVersion = parseGlibcVersion(glibcVersion);
      } catch (e) {
        glibcVersion = 'unknown';
      }

      conn.end();

      // 检查兼容性
      const compatibility = checkSystemCompatibility(osInfo, glibcVersion);

      if (!compatibility.compatible) {
        throw new Error(compatibility.message);
      }
    } catch (err: any) {
      conn.end();
      throw new Error('环境检测失败：' + err.message);
    }

    // 创建安装任务
    const taskResult = await db`
      INSERT INTO install_tasks (server_id, user_id, status, current_step, total_steps, install_method, logs)
      VALUES (${server_id}, ${userId}, 'running', 0, 6, ${install_method}, '[]'::jsonb)
      RETURNING *
    `;

    const taskId = taskResult[0].id;

    // 异步执行安装
    (async () => {
      const logs: string[] = [];
      let currentStep = 0;

      try {
        const conn = new Client();

        logs.push('[步骤 1/6] 检查服务器环境...');
        pushInstallProgress(taskId, 1, logs, 'running');

        await new Promise<void>((resolve, reject) => {
          conn.connect({
            host: server.public_ip,
            port: server.ssh_port || 22,
            username: server.ssh_user,
            password: server.ssh_password,
            readyTimeout: 30000,
          });
          conn.on('ready', () => resolve());
          conn.on('error', (err) => reject(err));
          conn.on('timeout', () => reject(new Error('SSH 连接超时')));
        });

        logs.push('✓ SSH 连接成功');
        pushInstallProgress(taskId, 1, logs, 'running');

        // Step 1: 环境检测（已在上游完成）
        currentStep = 1;
        logs.push('✓ 系统兼容性检查通过');
        pushInstallProgress(taskId, currentStep, logs, 'running');

        // Step 2: 执行官方安装脚本
        currentStep = 2;
        logs.push('[步骤 2/6] 下载 OpenClaw 安装包...');
        pushInstallProgress(taskId, currentStep, logs, 'running');

        // 使用 curl 执行官方安装脚本
        const installResult = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('安装脚本执行超时（超过 5 分钟）'));
          }, 5 * 60 * 1000);

          conn.exec('curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard', (err, stream) => {
            if (err) {
              clearTimeout(timeout);
              reject(err);
              return;
            }

            stream.stdout.on('data', (data) => {
              const line = data.toString();
              if (line.trim()) {
                logs.push(line.trim());
                pushInstallProgress(taskId, currentStep, logs, 'running');
              }
            });
            stream.stderr.on('data', (data) => {
              const line = data.toString();
              if (line.trim()) {
                logs.push('[错误] ' + line.trim());
                pushInstallProgress(taskId, currentStep, logs, 'running');
              }
            });
            stream.on('close', (code) => {
              clearTimeout(timeout);
              if (code === 0) {
                resolve('安装成功');
              } else {
                reject(new Error(`安装失败，退出码：${code}`));
              }
            });
            stream.on('error', (err) => {
              clearTimeout(timeout);
              reject(err);
            });
          });
        });
        logs.push(`\n✓ ${installResult}`);

        // Step 3: 验证安装
        currentStep = 3;
        logs.push('[步骤 3/6] 验证安装...');
        pushInstallProgress(taskId, currentStep, logs, 'running');

        await new Promise(resolve => setTimeout(resolve, 3000));

        const healthCheck = await new Promise<string>((resolve, reject) => {
          conn.exec('curl -s http://localhost:8080/health || echo "failed"', (err, stream) => {
            if (err) reject(err);
            let output = '';
            stream.on('data', (data) => output += data.toString());
            stream.on('close', () => resolve(output.trim()));
          });
        });
        logs.push(`健康检查：${healthCheck}`);

        // Step 4: 检查服务状态
        currentStep = 4;
        logs.push('[步骤 4/6] 检查服务状态...');
        pushInstallProgress(taskId, currentStep, logs, 'running');

        const processCheck = await new Promise<string>((resolve, reject) => {
          conn.exec('ps aux | grep openclaw | grep -v grep || echo "not running"', (err, stream) => {
            if (err) reject(err);
            let output = '';
            stream.on('data', (data) => output += data.toString());
            stream.on('close', () => resolve(output.trim()));
          });
        });
        logs.push(`进程状态：${processCheck || '未运行'}`);

        // Step 5: 检查日志
        currentStep = 5;
        logs.push('[步骤 5/6] 检查服务日志...');
        pushInstallProgress(taskId, currentStep, logs, 'running');

        const logCheck = await new Promise<string>((resolve, reject) => {
          conn.exec('tail -20 /var/log/openclaw.log 2>/dev/null || echo "no logs"', (err, stream) => {
            if (err) reject(err);
            let output = '';
            stream.on('data', (data) => output += data.toString());
            stream.on('close', () => resolve(output.trim()));
          });
        });
        logs.push(`最新日志：${logCheck.substring(0, 200) || '暂无日志'}`);

        // Step 6: 完成
        currentStep = 6;
        logs.push('[步骤 6/6] 安装完成');
        pushInstallProgress(taskId, currentStep, logs, 'running');

        conn.end();

        // 更新任务状态为完成
        await db`
          UPDATE install_tasks
          SET status = 'completed', current_step = ${currentStep}, logs = ${JSON.stringify(logs)}, completed_at = NOW()
          WHERE id = ${taskId}
        `;
        pushInstallProgress(taskId, currentStep, logs, 'completed');

        // 更新 OpenClaw 实例状态
        await db`
          INSERT INTO openclaw_instances (server_id, user_id, version, status, installed_at)
          VALUES (${server_id}, ${userId}, 'latest', 'running', NOW())
          ON CONFLICT (server_id) DO UPDATE SET status = 'running', updated_at = NOW()
        `;

      } catch (err: any) {
        logs.push(`错误：${err.message}`);
        pushInstallProgress(taskId, currentStep, logs, 'failed');

        await db`
          UPDATE install_tasks
          SET status = 'failed', current_step = ${currentStep}, logs = ${JSON.stringify(logs)}, error_step = ${currentStep}, error_message = ${err.message}
          WHERE id = ${taskId}
        `;
      }
    })();

    return { taskId, message: '安装已启动' };
  });

  // 查询安装任务状态
  app.get('/tasks/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const tasks = await db`
      SELECT * FROM install_tasks
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (tasks.length === 0) {
      throw new Error('任务不存在');
    }

    const task = tasks[0];

    // 优先返回内存中的实时状态（如果有）
    const memStatus = installTaskStatus.get(id);
    if (memStatus) {
      return {
        id: task.id,
        status: memStatus.status,
        currentStep: memStatus.step,
        totalSteps: task.total_steps,
        installMethod: task.install_method,
        logs: memStatus.logs || [],
        errorStep: task.error_step,
        errorMessage: task.error_message,
        startedAt: task.started_at,
        completedAt: task.completed_at,
      };
    }

    return {
      id: task.id,
      status: task.status,
      currentStep: task.current_step,
      totalSteps: task.total_steps,
      installMethod: task.install_method,
      logs: task.logs || [],
      errorStep: task.error_step,
      errorMessage: task.error_message,
      startedAt: task.started_at,
      completedAt: task.completed_at,
    };
  });

  // 取消安装任务
  app.post('/tasks/:id/cancel', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const tasks = await db`
      SELECT * FROM install_tasks
      WHERE id = ${id} AND user_id = ${userId} AND status = 'running'
    `;

    if (tasks.length === 0) {
      throw new Error('任务不存在或已完成');
    }

    await db`
      UPDATE install_tasks SET status = 'cancelled', completed_at = NOW()
      WHERE id = ${id}
    `;

    pushInstallProgress(id, 0, ['安装已取消'], 'cancelled');

    return { message: '安装已取消' };
  });

  // 上传安装包（备用方案）
  app.post('/offline-upload', { preHandler: [authMiddleware] }, async (request) => {
    const data = await request.file();

    if (!data || data.filename !== 'openclaw.tar.gz') {
      throw new Error('请上传 openclaw.tar.gz 文件');
    }

    const path = require('path');
    const filePath = path.join('/tmp', data.filename);
    const fs = require('fs');

    await new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(filePath);
      data.file.pipe(fileStream);
      data.file.on('end', resolve);
      data.file.on('error', reject);
    });

    return { message: '文件上传成功', path: filePath };
  });

  // 获取服务状态
  app.get('/:serverId/status', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const instances = await db`
      SELECT o.*, s.public_ip, s.ssh_port
      FROM openclaw_instances o
      JOIN servers s ON o.server_id = s.id
      WHERE o.server_id = ${serverId} AND o.user_id = ${userId}
      LIMIT 1
    `;

    if (instances.length === 0) {
      return { status: 'not_installed', message: '未安装 OpenClaw' };
    }

    const instance = instances[0];
    return { status: instance.status, version: instance.version, port: instance.listen_port };
  });

  // 启动服务
  app.post('/:serverId/start', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const instances = await db`
      SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password
      FROM openclaw_instances o
      JOIN servers s ON o.server_id = s.id
      WHERE o.server_id = ${serverId} AND o.user_id = ${userId}
      LIMIT 1
    `;

    if (instances.length === 0) {
      throw new Error('未安装 OpenClaw');
    }

    const instance = instances[0];
    const conn = new Client();

    await new Promise<void>((resolve, reject) => {
      conn.connect({
        host: instance.public_ip,
        port: instance.ssh_port || 22,
        username: instance.ssh_user,
        password: instance.ssh_password,
        readyTimeout: 10000,
      });
      conn.on('ready', () => resolve()).on('error', reject);
    });

    await new Promise<void>((resolve, reject) => {
      conn.exec('cd /opt/openclaw && nohup ./openclaw > /var/log/openclaw.log 2>&1 &', (err, stream) => {
        if (err) reject(err);
        stream.on('close', () => resolve());
      });
    });

    conn.end();
    await db`UPDATE openclaw_instances SET status = 'running', updated_at = NOW() WHERE server_id = ${serverId}`;

    return { message: '服务已启动' };
  });

  // 停止服务
  app.post('/:serverId/stop', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const instances = await db`
      SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password
      FROM openclaw_instances o
      JOIN servers s ON o.server_id = s.id
      WHERE o.server_id = ${serverId} AND o.user_id = ${userId}
      LIMIT 1
    `;

    if (instances.length === 0) {
      throw new Error('未安装 OpenClaw');
    }

    const instance = instances[0];
    const conn = new Client();

    await new Promise<void>((resolve, reject) => {
      conn.connect({
        host: instance.public_ip,
        port: instance.ssh_port || 22,
        username: instance.ssh_user,
        password: instance.ssh_password,
        readyTimeout: 10000,
      });
      conn.on('ready', () => resolve()).on('error', reject);
    });

    await new Promise<void>((resolve, reject) => {
      conn.exec('pkill -f "openclaw" || true', (err, stream) => {
        if (err) reject(err);
        stream.on('close', () => resolve());
      });
    });

    conn.end();
    await db`UPDATE openclaw_instances SET status = 'stopped', updated_at = NOW() WHERE server_id = ${serverId}`;

    return { message: '服务已停止' };
  });

  // 重启服务
  app.post('/:serverId/restart', { preHandler: [authMiddleware] }, async (request) => {
    await openclawRoutesInternal.stop(request);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await openclawRoutesInternal.start(request);
    return { message: '服务已重启' };
  });

  // 获取配置
  app.get('/:serverId/config', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const instances = await db`
      SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password
      FROM openclaw_instances o
      JOIN servers s ON o.server_id = s.id
      WHERE o.server_id = ${serverId} AND o.user_id = ${userId}
      LIMIT 1
    `;

    if (instances.length === 0) {
      throw new Error('未安装 OpenClaw');
    }

    const instance = instances[0];
    const conn = new Client();

    await new Promise<void>((resolve, reject) => {
      conn.connect({
        host: instance.public_ip,
        port: instance.ssh_port || 22,
        username: instance.ssh_user,
        password: instance.ssh_password,
        readyTimeout: 10000,
      });
      conn.on('ready', () => resolve()).on('error', reject);
    });

    const config = await new Promise<string>((resolve, reject) => {
      conn.exec('cat /opt/openclaw/config.yaml', (err, stream) => {
        if (err) reject(err);
        let output = '';
        stream.on('data', (data) => output += data.toString()).on('close', () => resolve(output));
      });
    });

    conn.end();
    return { config: config, configFile: instance.config_file || '/opt/openclaw/config.yaml' };
  });

  // 更新配置
  app.put('/:serverId/config', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };
    const { config } = request.body as { config: string };

    if (!config) {
      throw new Error('配置内容不能为空');
    }

    const instances = await db`
      SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password
      FROM openclaw_instances o
      JOIN servers s ON o.server_id = s.id
      WHERE o.server_id = ${serverId} AND o.user_id = ${userId}
      LIMIT 1
    `;

    if (instances.length === 0) {
      throw new Error('未安装 OpenClaw');
    }

    const instance = instances[0];
    const conn = new Client();

    await new Promise<void>((resolve, reject) => {
      conn.connect({
        host: instance.public_ip,
        port: instance.ssh_port || 22,
        username: instance.ssh_user,
        password: instance.ssh_password,
        readyTimeout: 10000,
      });
      conn.on('ready', () => resolve()).on('error', reject);
    });

    await new Promise<void>((resolve, reject) => {
      conn.exec(`cat > /opt/openclaw/config.yaml << 'EOF'\n${config}\nEOF`, (err, stream) => {
        if (err) reject(err);
        stream.on('close', (code) => code === 0 ? resolve() : reject(new Error('配置更新失败')));
      });
    });

    conn.end();
    await db`UPDATE openclaw_instances SET config = ${config}, updated_at = NOW() WHERE id = ${instance.id}`;

    return { message: '配置已更新' };
  });

  // 验证配置
  app.post('/:serverId/config/validate', { preHandler: [authMiddleware] }, async (request) => {
    const { config } = request.body as { config: string };

    try {
      const lines = config.split('\n');
      for (const line of lines) {
        if (line.trim() && !line.startsWith('#') && !line.includes(':')) {
          return { valid: false, error: '无效的 YAML 格式' };
        }
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, error: 'YAML 格式错误' };
    }
  });

  // 获取配置历史版本
  app.get('/:serverId/config/versions', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const instances = await db`SELECT id FROM openclaw_instances WHERE server_id = ${serverId} AND user_id = ${userId}`;

    if (instances.length === 0) {
      throw new Error('未安装 OpenClaw');
    }

    const versions = await db`
      SELECT * FROM config_versions
      WHERE config_type = 'openclaw' AND config_id = ${instances[0].id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return { versions: versions || [] };
  });

  // 回滚配置
  app.post('/:serverId/config/rollback', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };
    const { versionId } = request.body as { versionId: string };

    const versions = await db`SELECT * FROM config_versions WHERE id = ${versionId}`;

    if (versions.length === 0) {
      throw new Error('版本不存在');
    }

    const version = versions[0];

    await openclawRoutesInternal.updateConfig({
      params: { serverId },
      body: { config: version.snapshot }
    } as any);

    return { message: '配置已回滚' };
  });

  // 获取运行日志
  app.get('/:serverId/logs', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const instances = await db`
      SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password
      FROM openclaw_instances o
      JOIN servers s ON o.server_id = s.id
      WHERE o.server_id = ${serverId} AND o.user_id = ${userId}
      LIMIT 1
    `;

    if (instances.length === 0) {
      throw new Error('未安装 OpenClaw');
    }

    const instance = instances[0];
    const conn = new Client();

    await new Promise<void>((resolve, reject) => {
      conn.connect({
        host: instance.public_ip,
        port: instance.ssh_port || 22,
        username: instance.ssh_user,
        password: instance.ssh_password,
        readyTimeout: 10000,
      });
      conn.on('ready', () => resolve()).on('error', reject);
    });

    const logs = await new Promise<string>((resolve, reject) => {
      conn.exec('tail -100 /var/log/openclaw.log', (err, stream) => {
        if (err) reject(err);
        let output = '';
        stream.on('data', (data) => output += data.toString()).on('close', () => resolve(output));
      });
    });

    conn.end();
    return { logs: logs || '暂无日志' };
  });

  // 检查 OpenClaw 版本
  app.get('/:serverId/version', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const instances = await db`
      SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password
      FROM openclaw_instances o
      JOIN servers s ON o.server_id = s.id
      WHERE o.server_id = ${serverId} AND o.user_id = ${userId}
      LIMIT 1
    `;

    if (instances.length === 0) {
      return { installed: false, version: '未安装', isLatest: true };
    }

    const instance = instances[0];
    const conn = new Client();

    try {
      await new Promise<void>((resolve, reject) => {
        conn.connect({
          host: instance.public_ip,
          port: instance.ssh_port || 22,
          username: instance.ssh_user,
          password: instance.ssh_password,
          readyTimeout: 10000,
        });
        conn.on('ready', () => resolve()).on('error', reject);
      });

      // 获取当前版本
      const versionOutput = await new Promise<string>((resolve, reject) => {
        conn.exec('openclaw -v 2>&1', (err, stream) => {
          if (err) reject(err);
          let output = '';
          stream.on('data', (data) => output += data.toString());
          stream.on('close', () => resolve(output.trim()));
        });
      });

      conn.end();

      // 解析版本号 OpenClaw 2026.3.28 (f9b1079)
      const versionMatch = versionOutput.match(/OpenClaw\s+([\d.]+)/);
      const currentVersion = versionMatch ? versionMatch[1] : 'unknown';

      // 获取最新版本（从官方网站）
      const latestVersion = await new Promise<string>((resolve) => {
        conn.exec('curl -s https://openclaw.ai/version 2>/dev/null || echo "unknown"', (err, stream) => {
          if (err) {
            resolve('unknown');
            return;
          }
          let output = '';
          stream.on('data', (data) => output += data.toString());
          stream.on('close', () => {
            const vMatch = output.match(/([\d.]+)/);
            resolve(vMatch ? vMatch[1] : 'unknown');
          });
        });
      });

      const isLatest = currentVersion === latestVersion || latestVersion === 'unknown';

      return {
        installed: true,
        version: currentVersion,
        latestVersion: latestVersion,
        isLatest,
        rawOutput: versionOutput,
      };
    } catch (err: any) {
      conn.end();
      return {
        installed: true,
        version: '未知',
        isLatest: true,
        error: err.message,
      };
    }
  });

  // 更新 OpenClaw
  app.post('/:serverId/update', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const instances = await db`
      SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password
      FROM openclaw_instances o
      JOIN servers s ON o.server_id = s.id
      WHERE o.server_id = ${serverId} AND o.user_id = ${userId}
      LIMIT 1
    `;

    if (instances.length === 0) {
      throw new Error('未安装 OpenClaw');
    }

    const instance = instances[0];
    const conn = new Client();

    try {
      await new Promise<void>((resolve, reject) => {
        conn.connect({
          host: instance.public_ip,
          port: instance.ssh_port || 22,
          username: instance.ssh_user,
          password: instance.ssh_password,
          readyTimeout: 10000,
        });
        conn.on('ready', () => resolve()).on('error', reject);
      });

      // 执行更新脚本
      await new Promise<void>((resolve, reject) => {
        conn.exec('curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard', (err, stream) => {
          if (err) {
            reject(err);
            return;
          }
          let output = '';
          stream.stdout.on('data', (data) => { output += data.toString(); });
          stream.stderr.on('data', (data) => { output += data.toString(); });
          stream.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`更新失败，退出码：${code}`));
            }
          });
        });
      });

      conn.end();
      await db`UPDATE openclaw_instances SET status = 'running', updated_at = NOW() WHERE server_id = ${serverId}`;

      return { message: '更新成功' };
    } catch (err: any) {
      conn.end();
      throw new Error('更新失败：' + err.message);
    }
  });

  // 环境检测（安装前检查系统兼容性）
  app.post('/:serverId/check-env', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };

    const servers = await db`
      SELECT * FROM servers
      WHERE id = ${serverId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (servers.length === 0) {
      throw new Error('服务器不存在');
    }

    const server = servers[0];
    const conn = new Client();

    try {
      await new Promise<void>((resolve, reject) => {
        conn.connect({
          host: server.public_ip,
          port: server.ssh_port || 22,
          username: server.ssh_user,
          password: server.ssh_password,
          readyTimeout: 15000,
        });
        conn.on('ready', () => resolve()).on('error', reject);
      });

      // 获取系统信息
      const osInfo = await new Promise<string>((resolve, reject) => {
        conn.exec('cat /etc/os-release 2>/dev/null || uname -a', (err, stream) => {
          if (err) reject(err);
          let output = '';
          stream.on('data', (data) => output += data.toString());
          stream.on('close', () => resolve(output.trim()));
        });
      });

      // 检查 Node.js 版本
      let nodeVersion = '';
      try {
        nodeVersion = await new Promise<string>((resolve, reject) => {
          conn.exec('node --version 2>/dev/null || echo "not installed"', (err, stream) => {
            if (err) reject(err);
            let output = '';
            stream.on('data', (data) => output += data.toString());
            stream.on('close', () => resolve(output.trim()));
          });
        });
      } catch (e) {
        nodeVersion = 'not installed';
      }

      // 检查 Docker
      let dockerVersion = '';
      try {
        dockerVersion = await new Promise<string>((resolve, reject) => {
          conn.exec('docker --version 2>/dev/null || echo "not installed"', (err, stream) => {
            if (err) reject(err);
            let output = '';
            stream.on('data', (data) => output += data.toString());
            stream.on('close', () => resolve(output.trim()));
          });
        });
      } catch (e) {
        dockerVersion = 'not installed';
      }

      conn.end();

      // 检查兼容性
      const compatibility = checkSystemCompatibility(osInfo, nodeVersion);

      return {
        compatible: compatibility.compatible,
        message: compatibility.message,
        osDetected: compatibility.osDetected,
        nodeVersion: nodeVersion || '未安装',
        dockerVersion: dockerVersion || '未安装',
        systemInfo: osInfo.split('\n').find(line => line.startsWith('PRETTY_NAME'))?.split('=')[1]?.replace(/"/g, '') || osInfo.split('\n')[0],
      };
    } catch (err: any) {
      conn.end();
      return {
        compatible: false,
        message: '无法连接到服务器：' + err.message,
        error: err.message,
      };
    }
  });
}

// 内部引用用于重启
const openclawRoutesInternal = {
  stop: async (request: any) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };
    const instances = await db`SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password FROM openclaw_instances o JOIN servers s ON o.server_id = s.id WHERE o.server_id = ${serverId} AND o.user_id = ${userId} LIMIT 1`;
    if (instances.length === 0) throw new Error('未安装 OpenClaw');
    const instance = instances[0];
    const conn = new Client();
    await new Promise<void>((resolve, reject) => {
      conn.connect({ host: instance.public_ip, port: instance.ssh_port || 22, username: instance.ssh_user, password: instance.ssh_password, readyTimeout: 10000 });
      conn.on('ready', () => resolve()).on('error', reject);
    });
    await new Promise<void>((resolve, reject) => {
      conn.exec('pkill -f "openclaw" || true', (err, stream) => { if (err) reject(err); stream.on('close', () => resolve()); });
    });
    conn.end();
    await db`UPDATE openclaw_instances SET status = 'stopped', updated_at = NOW() WHERE server_id = ${serverId}`;
  },
  start: async (request: any) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };
    const instances = await db`SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password FROM openclaw_instances o JOIN servers s ON o.server_id = s.id WHERE o.server_id = ${serverId} AND o.user_id = ${userId} LIMIT 1`;
    if (instances.length === 0) throw new Error('未安装 OpenClaw');
    const instance = instances[0];
    const conn = new Client();
    await new Promise<void>((resolve, reject) => {
      conn.connect({ host: instance.public_ip, port: instance.ssh_port || 22, username: instance.ssh_user, password: instance.ssh_password, readyTimeout: 10000 });
      conn.on('ready', () => resolve()).on('error', reject);
    });
    await new Promise<void>((resolve, reject) => {
      conn.exec('cd /opt/openclaw && nohup ./openclaw > /var/log/openclaw.log 2>&1 &', (err, stream) => { if (err) reject(err); stream.on('close', () => resolve()); });
    });
    conn.end();
    await db`UPDATE openclaw_instances SET status = 'running', updated_at = NOW() WHERE server_id = ${serverId}`;
  },
  updateConfig: async (request: any) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { serverId } = request.params as { serverId: string };
    const { config } = request.body as { config: string };
    const instances = await db`SELECT o.*, s.public_ip, s.ssh_port, s.ssh_user, s.ssh_password FROM openclaw_instances o JOIN servers s ON o.server_id = s.id WHERE o.server_id = ${serverId} AND o.user_id = ${userId} LIMIT 1`;
    if (instances.length === 0) throw new Error('未安装 OpenClaw');
    const instance = instances[0];
    const conn = new Client();
    await new Promise<void>((resolve, reject) => {
      conn.connect({ host: instance.public_ip, port: instance.ssh_port || 22, username: instance.ssh_user, password: instance.ssh_password, readyTimeout: 10000 });
      conn.on('ready', () => resolve()).on('error', reject);
    });
    await new Promise<void>((resolve, reject) => {
      conn.exec(`cat > /opt/openclaw/config.yaml << 'EOF'\n${config}\nEOF`, (err, stream) => { if (err) reject(err); stream.on('close', (code) => code === 0 ? resolve() : reject(new Error('配置更新失败'))); });
    });
    conn.end();
    await db`UPDATE openclaw_instances SET config = ${config}, updated_at = NOW() WHERE id = ${instance.id}`;
  }
};
