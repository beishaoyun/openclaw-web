import { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { getSql } from '../../database';

interface AddSkillBody {
  name: string;
  description?: string;
  model_id?: string;
  channel_id?: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  is_public?: boolean;
  config?: Record<string, any>;
}

// 预设技能模板
const SKILL_TEMPLATES = [
  {
    id: 'chat-assistant',
    name: '智能助手',
    description: '通用对话助手，支持多轮对话、上下文理解',
    system_prompt: '你是一个有帮助的 AI 助手。请用友好、专业的语气回答用户的问题。',
    default_config: {
      max_tokens: 2048,
      temperature: 0.7
    }
  },
  {
    id: 'code-helper',
    name: '代码助手',
    description: '代码生成、审查、调试助手',
    system_prompt: '你是一个专业的程序员助手。请帮助用户编写、审查、调试代码。回答时请提供清晰的代码示例和解释。',
    default_config: {
      max_tokens: 4096,
      temperature: 0.3
    }
  },
  {
    id: 'translator',
    name: '翻译助手',
    description: '多语言翻译，支持中英日韩法等语言',
    system_prompt: '你是一个专业的翻译助手。请将用户输入的内容翻译成目标语言，保持原意准确、表达自然。',
    default_config: {
      max_tokens: 2048,
      temperature: 0.5
    }
  },
  {
    id: 'writer',
    name: '写作助手',
    description: '文章、报告、邮件等文案创作',
    system_prompt: '你是一个专业的写作助手。请帮助用户撰写文章、报告、邮件等文案，注意文笔流畅、逻辑清晰。',
    default_config: {
      max_tokens: 4096,
      temperature: 0.8
    }
  },
  {
    id: 'analyst',
    name: '数据分析',
    description: '数据分析、图表解读、趋势预测',
    system_prompt: '你是一个数据分析专家。请帮助用户分析数据、解读图表、预测趋势，用数据支持你的结论。',
    default_config: {
      max_tokens: 4096,
      temperature: 0.4
    }
  },
  {
    id: 'customer-service',
    name: '客服助手',
    description: '自动回复客户咨询，处理常见问题',
    system_prompt: '你是一个专业的客服助手。请用友好、耐心的语气回答客户问题，遇到无法处理的问题时引导客户联系人工客服。',
    default_config: {
      max_tokens: 1024,
      temperature: 0.6
    }
  }
];

export async function skillRoutes(app: FastifyInstance) {
  // 获取技能模板列表
  app.get('/templates', { preHandler: [authMiddleware] }, async () => {
    return { templates: SKILL_TEMPLATES };
  });

  // 获取公开技能列表
  app.get('/public', async () => {
    const db = getSql();
    const skills = await db`
      SELECT s.*, u.username as creator_name
      FROM skills s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.is_public = true
      ORDER BY s.created_at DESC
    `;
    return { skills: skills || [] };
  });

  // 列出所有技能
  app.get('/', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;

    const skills = await db`
      SELECT s.*, m.name as model_name, c.name as channel_name
      FROM skills s
      LEFT JOIN models m ON s.model_id = m.id
      LEFT JOIN channels c ON s.channel_id = c.id
      WHERE s.user_id = ${userId}
      ORDER BY s.is_public DESC, s.created_at DESC
    `;

    return { data: skills || [] };
  });

  // 添加技能
  app.post('/', { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: AddSkillBody }>) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { name, description, model_id, channel_id, system_prompt, max_tokens, temperature, is_public, config } = request.body;

    if (!name) {
      throw new Error('技能名称不能为空');
    }

    // 验证模型是否存在（如果指定）
    if (model_id) {
      const models = await db`SELECT id FROM models WHERE id = ${model_id} AND user_id = ${userId}`;
      if (models.length === 0) {
        throw new Error('指定的模型不存在');
      }
    }

    // 验证通道是否存在（如果指定）
    if (channel_id) {
      const channels = await db`SELECT id FROM channels WHERE id = ${channel_id} AND user_id = ${userId}`;
      if (channels.length === 0) {
        throw new Error('指定的通道不存在');
      }
    }

    const result = await db`
      INSERT INTO skills (
        user_id, name, description, model_id, channel_id,
        system_prompt, max_tokens, temperature, is_public, config
      )
      VALUES (
        ${userId}, ${name}, ${description || null}, ${model_id || null}, ${channel_id || null},
        ${system_prompt || null}, ${max_tokens || 2048}, ${temperature || 0.7}, ${is_public || false}, ${config ? JSON.stringify(config) : null}
      )
      RETURNING *
    `;

    return { data: result[0], message: '技能添加成功' };
  });

  // 获取技能详情
  app.get('/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const skills = await db`
      SELECT s.*, m.name as model_name, c.name as channel_name
      FROM skills s
      LEFT JOIN models m ON s.model_id = m.id
      LEFT JOIN channels c ON s.channel_id = c.id
      WHERE s.id = ${id} AND s.user_id = ${userId}
    `;

    if (skills.length === 0) {
      throw new Error('技能不存在');
    }

    return { data: skills[0] };
  });

  // 更新技能
  app.put('/:id', { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: AddSkillBody; Params: { id: string } }>) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params;
    const { name, description, model_id, channel_id, system_prompt, max_tokens, temperature, is_public, config } = request.body;

    // 验证模型是否存在（如果指定）
    if (model_id) {
      const models = await db`SELECT id FROM models WHERE id = ${model_id} AND user_id = ${userId}`;
      if (models.length === 0) {
        throw new Error('指定的模型不存在');
      }
    }

    // 验证通道是否存在（如果指定）
    if (channel_id) {
      const channels = await db`SELECT id FROM channels WHERE id = ${channel_id} AND user_id = ${userId}`;
      if (channels.length === 0) {
        throw new Error('指定的通道不存在');
      }
    }

    const result = await db`
      UPDATE skills
      SET name = ${name},
          description = ${description || null},
          model_id = ${model_id || null},
          channel_id = ${channel_id || null},
          system_prompt = ${system_prompt || null},
          max_tokens = ${max_tokens || 2048},
          temperature = ${temperature || 0.7},
          is_public = ${is_public || false},
          config = ${config ? JSON.stringify(config) : null},
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('技能不存在或无权限');
    }

    return { data: result[0], message: '技能更新成功' };
  });

  // 删除技能
  app.delete('/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const result = await db`
      DELETE FROM skills
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('技能不存在或无权限');
    }

    return { message: '技能删除成功' };
  });

  // 测试技能
  app.post('/:id/test', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { message } = request.body as { message?: string };

    const skills = await db`
      SELECT s.*, m.api_endpoint, m.api_key, m.default_model, c.channel_type
      FROM skills s
      LEFT JOIN models m ON s.model_id = m.id
      LEFT JOIN channels c ON s.channel_id = c.id
      WHERE s.id = ${id} AND s.user_id = ${userId}
    `;

    if (skills.length === 0) {
      throw new Error('技能不存在');
    }

    const skill = skills[0];
    // TODO: 实现实际的技能测试（调用模型 API）
    return {
      success: true,
      message: '技能测试成功',
      response: `这是一个模拟响应。技能 "${skill.name}" 配置正确。`
    };
  });

  // 执行技能
  app.post('/:id/execute', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };
    const { message, context } = request.body as { message: string; context?: any };

    if (!message) {
      throw new Error('消息内容不能为空');
    }

    const skills = await db`
      SELECT s.*, m.api_endpoint, m.api_key, m.default_model, c.channel_type, c.app_id, c.app_secret
      FROM skills s
      LEFT JOIN models m ON s.model_id = m.id
      LEFT JOIN channels c ON s.channel_id = c.id
      WHERE s.id = ${id} AND s.user_id = ${userId}
    `;

    if (skills.length === 0) {
      throw new Error('技能不存在');
    }

    const skill = skills[0];
    // TODO: 实现实际的技能执行（调用模型 API 并通过通道发送）
    return {
      success: true,
      data: {
        message: '技能执行成功',
        response: `这是一个模拟响应。您的消息是：${message}`
      }
    };
  });

  // 导入公开技能
  app.post('/:id/import', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    // 从公开技能复制
    const publicSkills = await db`
      SELECT * FROM skills WHERE id = ${id} AND is_public = true
    `;

    if (publicSkills.length === 0) {
      throw new Error('技能不存在或未公开');
    }

    const sourceSkill = publicSkills[0];

    // 创建副本
    const result = await db`
      INSERT INTO skills (
        user_id, name, description, model_id, channel_id,
        system_prompt, max_tokens, temperature, is_public, config
      )
      VALUES (
        ${userId}, ${sourceSkill.name + ' (副本)'}, ${sourceSkill.description},
        ${sourceSkill.model_id}, ${sourceSkill.channel_id},
        ${sourceSkill.system_prompt}, ${sourceSkill.max_tokens}, ${sourceSkill.temperature},
        false, ${sourceSkill.config ? JSON.stringify(sourceSkill.config) : null}
      )
      RETURNING *
    `;

    return { data: result[0], message: '技能导入成功' };
  });

  // 从模板创建技能
  app.post('/from-template/:templateId', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { templateId } = request.params as { templateId: string };
    const { name, model_id, channel_id } = request.body as { name?: string; model_id?: string; channel_id?: string };

    const template = SKILL_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error('模板不存在');
    }

    const result = await db`
      INSERT INTO skills (
        user_id, name, description, model_id, channel_id,
        system_prompt, max_tokens, temperature, is_public, config
      )
      VALUES (
        ${userId}, ${name || template.name}, ${template.description},
        ${model_id || null}, ${channel_id || null},
        ${template.system_prompt},
        ${template.default_config.max_tokens},
        ${template.default_config.temperature},
        false, '{}'
      )
      RETURNING *
    `;

    return { data: result[0], message: '技能创建成功' };
  });
}
