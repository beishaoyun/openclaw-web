import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { adminAuthMiddleware, superAdminMiddleware } from '../../middleware/admin';
import { getSql } from '../../database';

const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  rule_type: z.string().max(50),
  condition: z.object({}).passthrough(),
  threshold: z.number().int().positive().optional(),
  window_minutes: z.number().int().positive().optional(),
  notify_emails: z.array(z.string().email()).optional(),
  is_active: z.boolean().optional(),
});

const updateConfigSchema = z.object({
  config_value: z.object({}).passthrough(),
  description: z.string().optional(),
});

export async function adminSystemRoutes(app: FastifyInstance) {
  // 告警列表
  app.get('/alerts', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const query = request.query as any;
      const { acknowledged, severity, limit } = query;

      const alerts = await db`
        SELECT al.*,
               ar.name as rule_name,
               au.username as acknowledged_by_name
        FROM alert_logs al
        LEFT JOIN alert_rules ar ON al.rule_id = ar.id
        LEFT JOIN admin_users au ON al.acknowledged_by = au.id
        WHERE 1=1
        ORDER BY al.triggered_at DESC
        LIMIT ${limit || 100}
      `;

      return { data: alerts || [] };
    } catch (err: any) {
      console.error('Failed to list alerts:', err);
      throw err;
    }
  });

  // 确认告警
  app.post('/alerts/:id/acknowledge', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const user = request.user as any;

      const result = await db`
        UPDATE alert_logs
        SET is_acknowledged = true,
            acknowledged_by = ${user.id},
            acknowledged_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('告警不存在');
      }

      return { message: '告警已确认' };
    } catch (err: any) {
      console.error('Failed to acknowledge alert:', err);
      throw err;
    }
  });

  // 批量确认告警
  app.post('/alerts/batch-acknowledge', { preHandler: [adminAuthMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { ids } = request.body as { ids: string[] };
      const user = request.user as any;

      await db`
        UPDATE alert_logs
        SET is_acknowledged = true,
            acknowledged_by = ${user.id},
            acknowledged_at = NOW()
        WHERE id = ANY(${ids})
      `;

      return { message: '告警已批量确认' };
    } catch (err: any) {
      console.error('Failed to batch acknowledge alerts:', err);
      throw err;
    }
  });

  // 告警规则列表
  app.get('/alert-rules', { preHandler: [adminAuthMiddleware] }, async () => {
    try {
      const db = getSql();
      const rules = await db`
        SELECT * FROM alert_rules
        ORDER BY created_at DESC
      `;

      return { data: rules || [] };
    } catch (err: any) {
      console.error('Failed to list alert rules:', err);
      throw err;
    }
  });

  // 创建告警规则
  app.post('/alert-rules', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const body = createAlertRuleSchema.parse(request.body);
      const user = request.user as any;

      const result = await db`
        INSERT INTO alert_rules (
          name, rule_type, "condition", threshold, window_minutes, notify_emails
        )
        VALUES (
          ${body.name}, ${body.rule_type}, ${JSON.stringify(body.condition)},
          ${body.threshold || null}, ${body.window_minutes || null},
          ${body.notify_emails ? JSON.stringify(body.notify_emails) : null}
        )
        RETURNING *
      `;

      return { data: result[0], message: '告警规则创建成功' };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        throw new Error(err.errors[0].message);
      }
      console.error('Failed to create alert rule:', err);
      throw err;
    }
  });

  // 更新告警规则
  app.put('/alert-rules/:id', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };
      const body = createAlertRuleSchema.partial().parse(request.body);

      const existingRules = await db`SELECT * FROM alert_rules WHERE id = ${id}`;
      if (existingRules.length === 0) {
        throw new Error('告警规则不存在');
      }

      // 逐个字段更新
      if (body.name !== undefined) {
        await db`UPDATE alert_rules SET name = ${body.name}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.rule_type !== undefined) {
        await db`UPDATE alert_rules SET rule_type = ${body.rule_type}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.condition !== undefined) {
        await db`UPDATE alert_rules SET condition = ${JSON.stringify(body.condition)}::jsonb, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.threshold !== undefined) {
        await db`UPDATE alert_rules SET threshold = ${body.threshold}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.window_minutes !== undefined) {
        await db`UPDATE alert_rules SET window_minutes = ${body.window_minutes}, updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.notify_emails !== undefined) {
        await db`UPDATE alert_rules SET notify_emails = ${JSON.stringify(body.notify_emails)}::text[], updated_at = NOW() WHERE id = ${id}`;
      }
      if (body.is_active !== undefined) {
        await db`UPDATE alert_rules SET is_active = ${body.is_active}, updated_at = NOW() WHERE id = ${id}`;
      }

      // 获取更新后的数据
      const result = await db`SELECT * FROM alert_rules WHERE id = ${id}`;

      return { data: result[0], message: '告警规则已更新' };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        throw new Error(err.errors[0].message);
      }
      console.error('Failed to update alert rule:', err);
      throw err;
    }
  });

  // 删除告警规则
  app.delete('/alert-rules/:id', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { id } = request.params as { id: string };

      const result = await db`
        DELETE FROM alert_rules
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        throw new Error('告警规则不存在');
      }

      return { message: '告警规则已删除' };
    } catch (err: any) {
      console.error('Failed to delete alert rule:', err);
      throw err;
    }
  });

  // 系统配置列表
  app.get('/configs', { preHandler: [superAdminMiddleware] }, async () => {
    try {
      const db = getSql();
      const configs = await db`
        SELECT sc.*,
               au.username as updated_by_name
        FROM system_configs sc
        LEFT JOIN admin_users au ON sc.updated_by = au.id
        ORDER BY sc.config_key ASC
      `;

      return { data: configs || [] };
    } catch (err: any) {
      console.error('Failed to list configs:', err);
      throw err;
    }
  });

  // 获取单个配置
  app.get('/configs/:key', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { key } = request.params as { key: string };

      const configs = await db`
        SELECT sc.*,
               au.username as updated_by_name
        FROM system_configs sc
        LEFT JOIN admin_users au ON sc.updated_by = au.id
        WHERE sc.config_key = ${key}
      `;

      if (configs.length === 0) {
        throw new Error('配置不存在');
      }

      return { data: configs[0] };
    } catch (err: any) {
      console.error('Failed to get config:', err);
      throw err;
    }
  });

  // 更新系统配置
  app.put('/configs/:key', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const { key } = request.params as { key: string };
      const body = updateConfigSchema.parse(request.body);
      const user = request.user as any;

      const result = await db`
        INSERT INTO system_configs (config_key, config_value, description, updated_by)
        VALUES (${key}, ${JSON.stringify(body.config_value)}, ${body.description || null}, ${user.id})
        ON CONFLICT (config_key) DO UPDATE
        SET config_value = EXCLUDED.config_value,
            description = EXCLUDED.description,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        RETURNING *
      `;

      return { data: result[0], message: '系统配置已更新' };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        throw new Error(err.errors[0].message);
      }
      console.error('Failed to update config:', err);
      throw err;
    }
  });

  // 获取访客配置
  app.get('/guest-settings', async (request) => {
    try {
      const db = getSql();
      const configs = await db`
        SELECT config_value FROM system_configs
        WHERE config_key = 'guest_settings'
      `;

      return { data: configs[0]?.config_value || { enabled: false } };
    } catch (err: any) {
      console.error('Failed to get guest settings:', err);
      throw err;
    }
  });

  // 更新访客配置
  app.put('/guest-settings', { preHandler: [superAdminMiddleware] }, async (request) => {
    try {
      const db = getSql();
      const body = request.body as any;
      const user = request.user as any;

      const result = await db`
        INSERT INTO system_configs (config_key, config_value, updated_by)
        VALUES ('guest_settings', ${JSON.stringify(body)}, ${user.id})
        ON CONFLICT (config_key) DO UPDATE
        SET config_value = EXCLUDED.config_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        RETURNING *
      `;

      return { data: result[0], message: '访客配置已更新' };
    } catch (err: any) {
      console.error('Failed to update guest settings:', err);
      throw err;
    }
  });
}
