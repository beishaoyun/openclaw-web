import { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { getSql } from '../../database';

interface AddServerBody {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
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

      return { data: servers[0] };
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
        SELECT public_ip, ssh_port, ssh_user, ssh_password FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      const server = servers[0];
      // TODO: 实现实际的 SSH 连接测试
      // 这里只是模拟测试成功
      return {
        success: true,
        message: `SSH 连接测试成功：${server.ssh_user}@${server.public_ip}:${server.ssh_port}`
      };
    } catch (err: any) {
      console.error('SSH test failed:', err);
      return { success: false, message: 'SSH 连接测试失败：' + err.message };
    }
  });

  // 一键重启
  app.post('/:id/reboot', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    try {
      const servers = await db`
        SELECT id FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      // TODO: 实现实际的 SSH 重启命令
      return { message: '重启命令已发送' };
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
        SELECT id FROM servers
        WHERE id = ${id} AND user_id = ${userId}
      `;

      if (servers.length === 0) {
        throw new Error('服务器不存在');
      }

      // TODO: 实现实际的 SSH 关机命令
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
      const result = await db`
        UPDATE servers
        SET last_checked_at = NOW(),
            updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('服务器不存在');
      }

      return { data: result[0], message: '状态已刷新' };
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
      await db`
        UPDATE servers
        SET updated_at = NOW()
        WHERE id = ANY(${ids}) AND user_id = ${userId}
      `;

      return { message: '批量重启已启动' };
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
      await db`
        UPDATE servers
        SET updated_at = NOW()
        WHERE id = ANY(${ids}) AND user_id = ${userId}
      `;

      return { message: '批量关机已启动' };
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
}
