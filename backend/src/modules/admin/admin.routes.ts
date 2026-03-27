import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { getSql } from '../../database';

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const createAdminSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['super_admin', 'operator', 'support']),
});

const updateAdminSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['super_admin', 'operator', 'support']).optional(),
  is_active: z.boolean().optional(),
});

export async function adminAuthRoutes(app: FastifyInstance) {
  // 管理员登录
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const body = loginSchema.parse(request.body);
      const db = getSql();

      // 从数据库查询管理员
      const admins = await db`
        SELECT * FROM admin_users
        WHERE username = ${body.username} AND is_active = true
        LIMIT 1
      `;

      if (admins.length === 0) {
        reply.code(401).send({ error: 'Invalid credentials', message: '用户名或密码错误' });
        return;
      }

      const admin = admins[0];

      // 验证密码
      const validPassword = await bcrypt.compare(body.password, admin.password_hash);
      if (!validPassword) {
        reply.code(401).send({ error: 'Invalid credentials', message: '用户名或密码错误' });
        return;
      }

      // 更新最后登录时间
      await db`
        UPDATE admin_users SET last_login_at = NOW() WHERE id = ${admin.id}
      `;

      // 生成 JWT token
      const token = app.jwt.sign({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isAdmin: true,
      });

      reply.send({
        data: {
          token,
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            last_login_at: admin.last_login_at,
          },
        },
        message: '登录成功',
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ error: 'Bad Request', message: err.errors[0].message });
        return;
      }
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 管理员登出
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // TODO: 实现 token 黑名单（如果需要）
    reply.send({ message: '登出成功' });
  });
}

export async function adminUsersRoutes(app: FastifyInstance) {
  // 管理员列表（仅超级管理员）
  app.get('/admins', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      if (user.role !== 'super_admin') {
        reply.code(403).send({ error: 'Forbidden', message: '仅超级管理员可查看管理员列表' });
        return;
      }

      const db = getSql();
      const admins = await db`
        SELECT id, username, email, role, is_active, last_login_at, created_at, updated_at
        FROM admin_users
        ORDER BY created_at DESC
      `;

      reply.send({ data: admins });
    } catch (err: any) {
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 创建管理员（仅超级管理员）
  app.post('/admins', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createAdminSchema.parse(request.body);
      const user = request.user as any;

      if (user.role !== 'super_admin') {
        reply.code(403).send({ error: 'Forbidden', message: '仅超级管理员可创建管理员' });
        return;
      }

      const db = getSql();

      // 检查用户名是否已存在
      const existing = await db`
        SELECT id FROM admin_users WHERE username = ${body.username} OR email = ${body.email}
      `;

      if (existing.length > 0) {
        reply.code(400).send({ error: 'Bad Request', message: '用户名或邮箱已存在' });
        return;
      }

      // 密码加密
      const passwordHash = await bcrypt.hash(body.password, 12);

      // 插入数据库
      const result = await db`
        INSERT INTO admin_users (username, email, password_hash, role)
        VALUES (${body.username}, ${body.email}, ${passwordHash}, ${body.role})
        RETURNING id, username, email, role, created_at
      `;

      reply.code(201).send({ data: result[0], message: '管理员创建成功' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ error: 'Bad Request', message: err.errors[0].message });
        return;
      }
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 更新管理员（仅超级管理员）
  app.put('/admins/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      if (user.role !== 'super_admin') {
        reply.code(403).send({ error: 'Forbidden', message: '仅超级管理员可更新管理员' });
        return;
      }

      const { id } = request.params as { id: string };
      const body = updateAdminSchema.parse(request.body);
      const db = getSql();

      // 不能修改自己的角色
      if (body.role && id === user.id) {
        reply.code(400).send({ error: 'Bad Request', message: '不能修改自己的角色' });
        return;
      }

      // 检查管理员是否存在
      const existing = await db`SELECT * FROM admin_users WHERE id = ${id}`;
      if (existing.length === 0) {
        reply.code(404).send({ error: 'Not Found', message: '管理员不存在' });
        return;
      }

      const admin = existing[0];

      // 逐个字段更新
      if (body.username !== undefined) {
        await db`UPDATE admin_users SET username = ${body.username}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.email !== undefined) {
        await db`UPDATE admin_users SET email = ${body.email}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.password !== undefined) {
        const passwordHash = await bcrypt.hash(body.password, 12);
        await db`UPDATE admin_users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.role !== undefined) {
        await db`UPDATE admin_users SET role = ${body.role}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.is_active !== undefined) {
        await db`UPDATE admin_users SET is_active = ${body.is_active}, updated_at = NOW() WHERE id = ${id}`;
      }

      // 获取更新后的数据
      const result = await db`SELECT id, username, email, role, is_active, updated_at FROM admin_users WHERE id = ${id}`;

      reply.send({ data: result[0], message: '管理员信息已更新' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ error: 'Bad Request', message: err.errors[0].message });
        return;
      }
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 删除管理员（仅超级管理员）
  app.delete('/admins/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user as any;
      if (user.role !== 'super_admin') {
        reply.code(403).send({ error: 'Forbidden', message: '仅超级管理员可删除管理员' });
        return;
      }

      const { id } = request.params as { id: string };

      // 不能删除自己
      if (id === user.id) {
        reply.code(400).send({ error: 'Bad Request', message: '不能删除自己' });
        return;
      }

      const db = getSql();
      const result = await db`
        DELETE FROM admin_users
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        reply.code(404).send({ error: 'Not Found', message: '管理员不存在' });
        return;
      }

      reply.send({ message: '管理员已删除' });
    } catch (err: any) {
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });
}

export async function adminDashboardRoutes(app: FastifyInstance) {
  // 获取统计数据
  app.get('/dashboard/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getSql();

      const [
        totalUsers,
        totalServers,
        totalOpenclawInstances,
        activeAlerts,
        pendingTickets,
        onlineServers,
        installTasksToday,
      ] = await Promise.all([
        db`SELECT COUNT(*) as count FROM users`,
        db`SELECT COUNT(*) as count FROM servers`,
        db`SELECT COUNT(*) as count FROM openclaw_instances`,
        db`SELECT COUNT(*) as count FROM alert_logs WHERE is_acknowledged = false`,
        db`SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'`,
        db`SELECT COUNT(*) as count FROM servers WHERE status = 'online'`,
        db`SELECT COUNT(*) as count FROM install_tasks WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ]);

      reply.send({
        data: {
          totalUsers: parseInt(totalUsers[0]?.count || '0'),
          totalServers: parseInt(totalServers[0]?.count || '0'),
          totalOpenclawInstances: parseInt(totalOpenclawInstances[0]?.count || '0'),
          activeAlerts: parseInt(activeAlerts[0]?.count || '0'),
          pendingTickets: parseInt(pendingTickets[0]?.count || '0'),
          onlineServers: parseInt(onlineServers[0]?.count || '0'),
          installTasksToday: parseInt(installTasksToday[0]?.count || '0'),
        },
      });
    } catch (err: any) {
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 获取活跃告警
  app.get('/dashboard/alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getSql();
      const alerts = await db`
        SELECT al.*, ar.name as rule_name
        FROM alert_logs al
        LEFT JOIN alert_rules ar ON al.rule_id = ar.id
        WHERE al.is_acknowledged = false
        ORDER BY al.triggered_at DESC
        LIMIT 50
      `;

      reply.send({ data: alerts });
    } catch (err: any) {
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 获取待处理工单
  app.get('/dashboard/tickets', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getSql();
      const tickets = await db`
        SELECT st.*, u.username as user_name, au.username as assigned_to_name
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        LEFT JOIN admin_users au ON st.assigned_to = au.id
        WHERE st.status = 'open'
        ORDER BY st.created_at DESC
        LIMIT 50
      `;

      reply.send({ data: tickets });
    } catch (err: any) {
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 获取最近安装任务
  app.get('/dashboard/install-tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getSql();
      const tasks = await db`
        SELECT it.*, s.public_ip as server_ip, s.name as server_name
        FROM install_tasks it
        LEFT JOIN servers s ON it.server_id = s.id
        ORDER BY it.created_at DESC
        LIMIT 50
      `;

      reply.send({ data: tasks });
    } catch (err: any) {
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });
}
