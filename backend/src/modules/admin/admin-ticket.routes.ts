import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { adminAuthMiddleware } from '../../middleware/admin';
import { getSql } from '../../database';

const updateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

const assignTicketSchema = z.object({
  assigned_to: z.string().uuid(),
});

const replyTicketSchema = z.object({
  content: z.string().min(1).max(10000),
  attachments: z.array(z.string()).optional(),
});

export async function adminTicketRoutes(app: FastifyInstance) {
  // 工单列表
  app.get('/tickets', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      const { status, category, priority, assigned_to } = query;

      // 使用 postgres 库的动态查询构建
      const statusFilter = status ? db`st.status = ${status}` : db`1=1`;
      const categoryFilter = category ? db`st.category = ${category}` : db`1=1`;
      const priorityFilter = priority ? db`st.priority = ${priority}` : db`1=1`;
      const assignedFilter = assigned_to ? db`st.assigned_to = ${assigned_to}` : db`1=1`;

      // 查询总数
      const countResult = await db`
        SELECT COUNT(*) as count
        FROM support_tickets st
        WHERE ${statusFilter} AND ${categoryFilter} AND ${priorityFilter} AND ${assignedFilter}
      `;
      const total = parseInt(countResult[0]?.count || '0');

      // 查询工单列表
      const tickets = await db`
        SELECT st.*,
               u.username as user_name,
               u.email as user_email,
               au.username as assigned_to_name,
               (SELECT COUNT(*) FROM ticket_replies tr WHERE tr.ticket_id = st.id) as reply_count
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        LEFT JOIN admin_users au ON st.assigned_to = au.id
        WHERE ${statusFilter} AND ${categoryFilter} AND ${priorityFilter} AND ${assignedFilter}
        ORDER BY
          CASE st.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END,
          st.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      return {
        data: tickets || [],
        total,
        page,
        pageSize,
      };
    } catch (err: any) {
      console.error('Failed to list tickets:', err);
      throw err;
    }
  });

  // 工单详情
  app.get('/tickets/:id', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };

      const tickets = await db`
        SELECT st.*,
               u.username as user_name,
               u.email as user_email,
               au.username as assigned_to_name,
               s.name as server_name,
               s.public_ip as server_ip
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        LEFT JOIN admin_users au ON st.assigned_to = au.id
        LEFT JOIN servers s ON st.server_id = s.id
        WHERE st.id = ${id}
      `;

      if (tickets.length === 0) {
        throw new Error('工单不存在');
      }

      // 获取回复列表
      const replies = await db`
        SELECT tr.*,
               u.username as user_name,
               au.username as admin_name
        FROM ticket_replies tr
        LEFT JOIN users u ON tr.user_id = u.id
        LEFT JOIN admin_users au ON tr.user_id = au.id
        WHERE tr.ticket_id = ${id}
        ORDER BY tr.created_at ASC
      `;

      return {
        data: tickets[0],
        replies: (replies || []).map(r => ({
          ...r,
          author_name: r.admin_name || r.user_name,
        }))
      };
    } catch (err: any) {
      console.error('Failed to get ticket:', err);
      throw err;
    }
  });

  // 修改工单状态
  app.put('/tickets/:id/status', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const body = updateTicketStatusSchema.parse(request.body);
      const user = request.user as any;

      const isResolved = body.status === 'resolved' || body.status === 'closed';
      const result = await db`
        UPDATE support_tickets
        SET status = ${body.status},
            resolved_at = ${isResolved ? db`NOW()` : null},
            resolved_by = ${isResolved ? user.id : null},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('工单不存在');
      }

      return { message: `工单状态已更新为 ${body.status}` };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        throw new Error(err.errors[0].message);
      }
      throw err;
    }
  });

  // 分配工单
  app.put('/tickets/:id/assign', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const body = assignTicketSchema.parse(request.body);

      const result = await db`
        UPDATE support_tickets
        SET assigned_to = ${body.assigned_to},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('工单不存在');
      }

      return { message: '工单已分配' };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        throw new Error(err.errors[0].message);
      }
      throw err;
    }
  });

  // 回复工单
  app.post('/tickets/:id/reply', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const body = replyTicketSchema.parse(request.body);
      const user = request.user as any;

      // 检查工单是否存在
      const tickets = await db`SELECT id FROM support_tickets WHERE id = ${id}`;
      if (tickets.length === 0) {
        throw new Error('工单不存在');
      }

      // 插入回复
      const attachmentsJson = body.attachments ? JSON.stringify(body.attachments) : '[]';
      const result = await db`
        INSERT INTO ticket_replies (ticket_id, user_id, is_admin, content, attachments)
        VALUES (${id}, ${user.id}, true, ${body.content}, ${attachmentsJson}::jsonb)
        RETURNING *
      `;

      // 如果工单已关闭，重新打开
      await db`
        UPDATE support_tickets
        SET status = 'in_progress', updated_at = NOW()
        WHERE id = ${id} AND status = 'closed'
      `;

      return { message: '回复已发送', data: result[0] };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        throw new Error(err.errors[0].message);
      }
      throw err;
    }
  });

  // 创建工单（管理员代用户创建）
  app.post('/tickets', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const body = request.body as any;

      const result = await db`
        INSERT INTO support_tickets (
          user_id, title, description, category, priority, server_id
        )
        VALUES (
          ${body.user_id}, ${body.title}, ${body.description},
          ${body.category}, ${body.priority || 'medium'}, ${body.server_id || null}
        )
        RETURNING *
      `;

      return { data: result[0], message: '工单创建成功' };
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      throw err;
    }
  });
}
