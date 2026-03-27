import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { adminAuthMiddleware, superAdminMiddleware } from '../../middleware/admin';
import { getSql } from '../../database';
import bcrypt from 'bcrypt';

const updateUserStatusSchema = z.object({
  is_active: z.boolean(),
});

const updateUserQuotaSchema = z.object({
  server_limit: z.number().int().positive(),
  api_quota: z.number().int().positive(),
});

export async function adminClientRoutes(app: FastifyInstance) {
  // 客户列表
  app.get('/users', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      const { search, status } = query;

      let conditions = ['1=1'];
      if (search) {
        conditions.push(`(username ILIKE '%${search}%' OR email ILIKE '%${search}%')`);
      }
      if (status !== undefined) {
        conditions.push(`is_active = ${status === 'active'}`);
      }

      const whereClause = conditions.join(' AND ');

      // 查询总数
      const countResult = await db`
        SELECT COUNT(*) as count FROM users WHERE ${db([whereClause])}
      `;
      const total = parseInt(countResult[0]?.count || '0');

      // 查询用户列表
      const users = await db`
        SELECT id, username, email, is_active, created_at,
               (SELECT COUNT(*) FROM servers WHERE user_id = users.id) as server_count,
               (SELECT COUNT(*) FROM install_tasks WHERE server_id IN (SELECT id FROM servers WHERE user_id = users.id)) as install_count
        FROM users
        WHERE ${db([whereClause])}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      return {
        data: users,
        total,
        page,
        pageSize,
      };
    } catch (err: any) {
      console.error('Failed to list users:', err);
      throw err;
    }
  });

  // 客户详情
  app.get('/users/:id', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };

      const users = await db`
        SELECT id, username, email, is_active, created_at, last_login_at
        FROM users
        WHERE id = ${id}
      `;

      if (users.length === 0) {
        throw new Error('用户不存在');
      }

      const user = users[0];

      // 获取用户的服务器数量
      const serverCount = await db`
        SELECT COUNT(*) as count FROM servers WHERE user_id = ${id}
      `;

      // 获取用户的模型数量
      const modelCount = await db`
        SELECT COUNT(*) as count FROM models WHERE user_id = ${id}
      `;

      // 获取用户的通道数量
      const channelCount = await db`
        SELECT COUNT(*) as count FROM channels WHERE user_id = ${id}
      `;

      // 获取用户的技能数量
      const skillCount = await db`
        SELECT COUNT(*) as count FROM skills WHERE user_id = ${id}
      `;

      // 获取用户的安装任务统计
      const installStats = await db`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'success') as success,
          COUNT(*) FILTER (WHERE status = 'error') as error,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM install_tasks
        WHERE server_id IN (SELECT id FROM servers WHERE user_id = ${id})
      `;

      return {
        data: {
          ...user,
          server_count: parseInt(serverCount[0]?.count || '0'),
          model_count: parseInt(modelCount[0]?.count || '0'),
          channel_count: parseInt(channelCount[0]?.count || '0'),
          skill_count: parseInt(skillCount[0]?.count || '0'),
          install_stats: installStats[0] || {},
        },
      };
    } catch (err: any) {
      console.error('Failed to get user:', err);
      throw err;
    }
  });

  // 修改客户账号状态
  app.put('/users/:id/status', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const body = updateUserStatusSchema.parse(request.body);
      const user = request.user as any;

      const result = await db`
        UPDATE users
        SET is_active = ${body.is_active}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, username, email, is_active
      `;

      if (result.length === 0) {
        throw new Error('用户不存在');
      }

      // 记录操作日志
      await db`
        INSERT INTO admin_operation_logs (admin_id, action, target_type, target_id, new_value)
        VALUES (${user.id}, 'update_user_status', 'user', ${id}, ${JSON.stringify({ is_active: body.is_active })})
      `;

      return { data: result[0], message: `用户状态已更新为${body.is_active ? '激活' : '禁用'}` };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        throw new Error(err.errors[0].message);
      }
      console.error('Failed to update user status:', err);
      throw err;
    }
  });

  // 修改客户配额
  app.put('/users/:id/quota', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const body = updateUserQuotaSchema.parse(request.body);
      const user = request.user as any;

      // 检查是否有 user_quotas 表，如果没有则创建或更新 system_configs 中的记录
      const result = await db`
        INSERT INTO system_configs (config_key, config_value, updated_by)
        VALUES (${'user_quota_' + id}, ${JSON.stringify(body)}, ${user.id})
        ON CONFLICT (config_key) DO UPDATE
        SET config_value = EXCLUDED.config_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        RETURNING *
      `;

      // 记录操作日志
      await db`
        INSERT INTO admin_operation_logs (admin_id, action, target_type, target_id, new_value)
        VALUES (${user.id}, 'update_user_quota', 'user', ${id}, ${JSON.stringify(body)})
      `;

      return { data: result[0], message: '用户配额已更新' };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        throw new Error(err.errors[0].message);
      }
      console.error('Failed to update user quota:', err);
      throw err;
    }
  });

  // 重置客户密码
  app.post('/users/:id/reset-password', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const user = request.user as any;

      // 生成临时密码
      const tempPassword = Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const result = await db`
        UPDATE users
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, username, email
      `;

      if (result.length === 0) {
        throw new Error('用户不存在');
      }

      // 记录操作日志
      await db`
        INSERT INTO admin_operation_logs (admin_id, action, target_type, target_id, new_value)
        VALUES (${user.id}, 'reset_user_password', 'user', ${id}, ${JSON.stringify({ temp_password: '******' })})
      `;

      // 在实际应用中，这里应该发送邮件给用户
      // 这里只返回临时密码（生产环境不应该这样做）
      return {
        data: result[0],
        temp_password: tempPassword,
        message: '密码已重置，请将临时密码发送给用户',
      };
    } catch (err: any) {
      console.error('Failed to reset user password:', err);
      throw err;
    }
  });

  // 查看客户服务器列表
  app.get('/users/:id/servers', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      const servers = await db`
        SELECT id, name, public_ip, ssh_port, status, ssh_status, openclaw_status,
               cpu_usage, memory_usage, disk_usage, created_at
        FROM servers
        WHERE user_id = ${id}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const countResult = await db`
        SELECT COUNT(*) as count FROM servers WHERE user_id = ${id}
      `;
      const total = parseInt(countResult[0]?.count || '0');

      return {
        data: servers,
        total,
        page,
        pageSize,
      };
    } catch (err: any) {
      console.error('Failed to list user servers:', err);
      throw err;
    }
  });

  // 查看客户操作日志
  app.get('/users/:id/logs', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      // 查询用户的安装任务日志
      const installLogs = await db`
        SELECT
          it.id,
          it.server_id,
          it.status,
          it.error_message,
          it.created_at,
          it.completed_at,
          s.name as server_name,
          s.public_ip as server_ip
        FROM install_tasks it
        LEFT JOIN servers s ON it.server_id = s.id
        WHERE s.user_id = ${id}
        ORDER BY it.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const countResult = await db`
        SELECT COUNT(*) as count
        FROM install_tasks it
        LEFT JOIN servers s ON it.server_id = s.id
        WHERE s.user_id = ${id}
      `;
      const total = parseInt(countResult[0]?.count || '0');

      return {
        data: installLogs,
        total,
        page,
        pageSize,
      };
    } catch (err: any) {
      console.error('Failed to list user logs:', err);
      throw err;
    }
  });

  // 客户提交工单
  app.post('/tickets', async (request) => {
    try {
      const db = getSql();
      const body = request.body as any;
      const user = request.user as any;

      const result = await db`
        INSERT INTO support_tickets (
          user_id, title, description, category, priority, server_id
        )
        VALUES (
          ${user.id}, ${body.title}, ${body.description},
          ${body.category}, ${body.priority || 'medium'}, ${body.server_id || null}
        )
        RETURNING *
      `;

      return { data: result[0], message: '工单提交成功' };
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      throw err;
    }
  });

  // 客户查看自己的工单
  app.get('/tickets', async (request) => {
    try {
      const db = getSql();
      const user = request.user as any;
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      const tickets = await db`
        SELECT st.*,
               au.username as assigned_to_name
        FROM support_tickets st
        LEFT JOIN admin_users au ON st.assigned_to = au.id
        WHERE st.user_id = ${user.id}
        ORDER BY st.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const countResult = await db`
        SELECT COUNT(*) as count FROM support_tickets WHERE user_id = ${user.id}
      `;
      const total = parseInt(countResult[0]?.count || '0');

      return {
        data: tickets,
        total,
        page,
        pageSize,
      };
    } catch (err: any) {
      console.error('Failed to list tickets:', err);
      throw err;
    }
  });

  // 客户查看自己的工单详情
  app.get('/tickets/:id', async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const user = request.user as any;

      const tickets = await db`
        SELECT st.*,
               au.username as assigned_to_name,
               s.name as server_name
        FROM support_tickets st
        LEFT JOIN admin_users au ON st.assigned_to = au.id
        LEFT JOIN servers s ON st.server_id = s.id
        WHERE st.id = ${id} AND st.user_id = ${user.id}
      `;

      if (tickets.length === 0) {
        throw new Error('工单不存在或无权限查看');
      }

      // 获取回复列表
      const replies = await db`
        SELECT tr.*,
               au.username as admin_name
        FROM ticket_replies tr
        LEFT JOIN admin_users au ON tr.user_id = au.id
        WHERE tr.ticket_id = ${id}
        ORDER BY tr.created_at ASC
      `;

      return {
        data: tickets[0],
        replies: replies.map(r => ({
          ...r,
          author_name: r.admin_name,
          is_admin: true
        }))
      };
    } catch (err: any) {
      console.error('Failed to get ticket:', err);
      throw err;
    }
  });

  // 客户回复自己的工单
  app.post('/tickets/:id/reply', async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const body = request.body as { content: string; attachments?: string[] };
      const user = request.user as any;

      // 检查工单是否存在且属于当前用户
      const tickets = await db`SELECT id FROM support_tickets WHERE id = ${id} AND user_id = ${user.id}`;
      if (tickets.length === 0) {
        throw new Error('工单不存在或无权限');
      }

      const result = await db`
        INSERT INTO ticket_replies (ticket_id, user_id, is_admin, content, attachments)
        VALUES (${id}, ${user.id}, false, ${body.content}, ${body.attachments ? JSON.stringify(body.attachments) : '[]'}::jsonb)
        RETURNING *
      `;

      return { data: result[0], message: '回复已发送' };
    } catch (err: any) {
      console.error('Failed to reply ticket:', err);
      throw err;
    }
  });
}
