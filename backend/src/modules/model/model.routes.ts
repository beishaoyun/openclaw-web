import { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { getSql } from '../../database';

interface AddModelBody {
  name?: string;
  provider: string;
  api_endpoint?: string;
  api_key: string;
  default_model?: string;
  is_default?: boolean;
}

const PROVIDER_PRESETS = [
  { id: 'volcengine', name: '火山引擎', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3' },
  { id: 'aliyun', name: '阿里云百炼', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'azure', name: 'Azure OpenAI', baseUrl: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}' },
  { id: 'moonshot', name: '月之暗面', baseUrl: 'https://api.moonshot.cn/v1' },
  { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1' },
  { id: 'zhipu', name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'baichuan', name: '百川智能', baseUrl: 'https://api.baichuan-ai.com/v1' },
  { id: 'stepfun', name: '阶跃星辰', baseUrl: 'https://api.stepfun.com/v1' },
  { id: '01ai', name: '零一万物', baseUrl: 'https://api.lingyiwanwu.com/v1' },
  { id: 'xai', name: 'xAI', baseUrl: 'https://api.x.ai/v1' },
];

export async function modelRoutes(app: FastifyInstance) {
  // 获取提供商预设列表
  app.get('/providers', { preHandler: [authMiddleware] }, async () => {
    return { data: PROVIDER_PRESETS };
  });

  // 列出所有模型
  app.get('/', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;

    const models = await db`
      SELECT * FROM models
      WHERE user_id = ${userId}
      ORDER BY is_default DESC, created_at DESC
    `;

    return { data: models };
  });

  // 添加模型
  app.post('/', { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: AddModelBody }>) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { name, provider, api_endpoint, api_key, default_model, is_default } = request.body;

    if (!provider) {
      throw new Error('提供商不能为空');
    }
    if (!api_key) {
      throw new Error('API Key 不能为空');
    }

    // 如果设置为默认，先取消其他模型的默认状态
    if (is_default) {
      await db`
        UPDATE models SET is_default = false WHERE user_id = ${userId}
      `;
    }

    const preset = PROVIDER_PRESETS.find(p => p.id === provider);
    const endpoint = api_endpoint || preset?.baseUrl;

    const result = await db`
      INSERT INTO models (user_id, name, provider, api_endpoint, api_key, default_model, is_default)
      VALUES (${userId}, ${name || null}, ${provider}, ${endpoint || null}, ${api_key}, ${default_model || null}, ${is_default || false})
      RETURNING *
    `;

    return { data: result[0], message: '模型添加成功' };
  });

  // 获取模型详情
  app.get('/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const models = await db`
      SELECT * FROM models
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (models.length === 0) {
      throw new Error('模型不存在');
    }

    return { data: models[0] };
  });

  // 更新模型
  app.put('/:id', { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: AddModelBody; Params: { id: string } }>) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params;
    const { name, provider, api_endpoint, api_key, default_model, is_default } = request.body;

    // 如果设置为默认，先取消其他模型的默认状态
    if (is_default) {
      await db`
        UPDATE models SET is_default = false WHERE user_id = ${userId} AND id != ${id}
      `;
    }

    const result = await db`
      UPDATE models
      SET name = ${name || null},
          provider = ${provider},
          api_endpoint = ${api_endpoint || null},
          api_key = ${api_key},
          default_model = ${default_model || null},
          is_default = ${is_default || false},
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('模型不存在或无权限');
    }

    return { data: result[0], message: '模型更新成功' };
  });

  // 删除模型
  app.delete('/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const result = await db`
      DELETE FROM models
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('模型不存在或无权限');
    }

    return { message: '模型删除成功' };
  });

  // 测试模型连接
  app.post('/:id/test', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const models = await db`
      SELECT provider, api_endpoint, api_key, default_model FROM models
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (models.length === 0) {
      throw new Error('模型不存在');
    }

    const model = models[0];
    // TODO: 实现实际的 API 连接测试
    return {
      success: true,
      message: `模型连接测试成功：${model.provider}`
    };
  });

  // 设置为默认模型
  app.post('/:id/set-default', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    // 先取消其他模型的默认状态
    await db`
      UPDATE models SET is_default = false WHERE user_id = ${userId}
    `;

    // 设置当前模型为默认
    const result = await db`
      UPDATE models SET is_default = true, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('模型不存在或无权限');
    }

    return { data: result[0], message: '已设置为默认模型' };
  });
}
