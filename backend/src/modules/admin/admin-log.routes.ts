import { FastifyInstance, FastifyRequest } from 'fastify';
import { adminAuthMiddleware } from '../../middleware/admin';
import { getSql } from '../../database';

export async function adminLogRoutes(app: FastifyInstance) {
  // 管理员操作日志
  app.get('/logs', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      const { admin_id, action, target_type, start_date, end_date } = query;

      // 使用 postgres 库的动态查询构建
      const adminFilter = admin_id ? db`ol.admin_id = ${admin_id}` : db`1=1`;
      const actionFilter = action ? db`ol.action = ${action}` : db`1=1`;
      const targetFilter = target_type ? db`ol.target_type = ${target_type}` : db`1=1`;
      const startDateFilter = start_date ? db`ol.created_at >= ${start_date}` : db`1=1`;
      const endDateFilter = end_date ? db`ol.created_at <= ${end_date}` : db`1=1`;

      // 查询总数
      const countResult = await db`
        SELECT COUNT(*) as count
        FROM admin_operation_logs ol
        LEFT JOIN admin_users au ON ol.admin_id = au.id
        WHERE ${adminFilter} AND ${actionFilter} AND ${targetFilter} AND ${startDateFilter} AND ${endDateFilter}
      `;
      const total = parseInt(countResult[0]?.count || '0');

      // 查询日志列表
      const logs = await db`
        SELECT ol.*,
               au.username as admin_name,
               au.email as admin_email
        FROM admin_operation_logs ol
        LEFT JOIN admin_users au ON ol.admin_id = au.id
        WHERE ${adminFilter} AND ${actionFilter} AND ${targetFilter} AND ${startDateFilter} AND ${endDateFilter}
        ORDER BY ol.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      return {
        data: logs || [],
        total,
        page,
        pageSize,
      };
    } catch (err: any) {
      console.error('Failed to list admin logs:', err);
      throw err;
    }
  });

  // 客户操作日志
  app.get('/operation-logs', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      const { user_id, action, start_date, end_date } = query;

      // 使用 postgres 库的动态查询构建
      const userFilter = user_id ? db`s.user_id = ${user_id}` : db`1=1`;
      const actionFilter = action ? db`it.status = ${action}` : db`1=1`;
      const startDateFilter = start_date ? db`it.created_at >= ${start_date}` : db`1=1`;
      const endDateFilter = end_date ? db`it.created_at <= ${end_date}` : db`1=1`;

      // 查询总数
      const countResult = await db`
        SELECT COUNT(*) as count
        FROM install_tasks it
        LEFT JOIN servers s ON it.server_id = s.id
        WHERE ${userFilter} AND ${actionFilter} AND ${startDateFilter} AND ${endDateFilter}
      `;
      const total = parseInt(countResult[0]?.count || '0');

      // 查询日志列表
      const logs = await db`
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
        WHERE ${userFilter} AND ${actionFilter} AND ${startDateFilter} AND ${endDateFilter}
        ORDER BY it.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      return {
        data: logs || [],
        total,
        page,
        pageSize,
      };
    } catch (err: any) {
      console.error('Failed to list operation logs:', err);
      throw err;
    }
  });

  // 登录日志
  app.get('/login-logs', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const query = request.query as any;
      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      const { start_date, end_date } = query;

      // 查询管理员登录日志
      const startDateFilter = start_date ? db`last_login_at >= ${start_date}` : db`1=1`;
      const endDateFilter = end_date ? db`last_login_at <= ${end_date}` : db`1=1`;

      const adminLogs = await db`
        SELECT
          id,
          username as user_name,
          email,
          role as user_type,
          last_login_at as login_time,
          'success' as status,
          'admin' as source
        FROM admin_users
        WHERE last_login_at IS NOT NULL AND ${startDateFilter} AND ${endDateFilter}
        ORDER BY last_login_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      // 查询用户登录日志（通过服务器创建时间来近似）
      const userLogs = await db`
        SELECT
          u.id,
          u.username as user_name,
          u.email,
          'user' as user_type,
          MAX(s.created_at) as login_time,
          'success' as status,
          'web' as source
        FROM users u
        LEFT JOIN servers s ON u.id = s.user_id
        GROUP BY u.id, u.username, u.email
        HAVING MAX(s.created_at) IS NOT NULL
        ORDER BY login_time DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      // 合并结果
      const allLogs = [...(adminLogs || []), ...(userLogs || [])];

      return {
        data: allLogs,
        total: allLogs.length,
        page,
        pageSize,
      };
    } catch (err: any) {
      console.error('Failed to list login logs:', err);
      throw err;
    }
  });

  // 导出日志（CSV 格式）
  app.get('/logs/export', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const query = request.query as any;
      const { start_date, end_date } = query;

      const startDateFilter = start_date ? db`ol.created_at >= ${start_date}` : db`1=1`;
      const endDateFilter = end_date ? db`ol.created_at <= ${end_date}` : db`1=1`;

      const logs = await db`
        SELECT ol.*,
               au.username as admin_name
        FROM admin_operation_logs ol
        LEFT JOIN admin_users au ON ol.admin_id = au.id
        WHERE ${startDateFilter} AND ${endDateFilter}
        ORDER BY ol.created_at DESC
        LIMIT 1000
      `;

      // 生成 CSV
      const headers = ['时间', '管理员', '操作', '目标类型', '目标 ID', '旧值', '新值'];
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        csvRows.push([
          log.created_at,
          log.admin_name || '',
          log.action,
          log.target_type || '',
          log.target_id || '',
          log.old_value ? JSON.stringify(log.old_value) : '',
          log.new_value ? JSON.stringify(log.new_value) : ''
        ].join(','));
      });

      return {
        data: csvRows.join('\n'),
        format: 'csv',
      };
    } catch (err: any) {
      console.error('Failed to export logs:', err);
      throw err;
    }
  });
}
