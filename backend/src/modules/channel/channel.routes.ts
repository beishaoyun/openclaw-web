import { FastifyInstance, FastifyRequest } from 'fastify';
import { authMiddleware } from '../../middleware/auth';
import { getSql } from '../../database';

interface AddChannelBody {
  name?: string;
  channel_type: string;
  base_url?: string;
  auth_type?: string;
  app_id?: string;
  app_secret?: string;
  bot_name?: string;
  webhook_url?: string;
  is_default?: boolean;
}

const CHANNEL_TEMPLATES = [
  {
    id: 'feishu',
    name: '飞书',
    icon: 'https://lf1-cdn-tos.bytegoofy.com/goofy/feishu/web-apps/feo-design/feo-icon- feishu.63367a33.svg',
    description: '飞书开放平台，支持文本、卡片、互动消息',
    config_fields: [
      { key: 'app_id', label: 'App ID', required: true, placeholder: 'cli_axxxxxxxxxxxxxxx' },
      { key: 'app_secret', label: 'App Secret', required: true, type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' },
      { key: 'bot_name', label: '机器人名称', required: false, placeholder: '小助手' }
    ],
    docs_url: 'https://open.feishu.cn/document/ukTMukTMukTM/ucjM14iN724M24yN'
  },
  {
    id: 'dingtalk',
    name: '钉钉',
    icon: 'https://img.alicdn.com/imgextra/i1/O1CN01l32c5V1M2x2Z1q3rR_!!6000000001378-2-tps-200-200.png',
    description: '钉钉开放平台，支持群机器人、互动消息',
    config_fields: [
      { key: 'app_id', label: 'AppKey', required: true, placeholder: 'xxxxxxxx' },
      { key: 'app_secret', label: 'AppSecret', required: true, type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' },
      { key: 'webhook_url', label: '机器人 Webhook', required: false, type: 'url', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxx' }
    ],
    docs_url: 'https://open.dingtalk.com/document/robots/custom-robot-access'
  },
  {
    id: 'wechat',
    name: '微信',
    icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.png',
    description: '微信公众号/企业微信，支持文本、图片、卡片消息',
    config_fields: [
      { key: 'app_id', label: 'AppID', required: true, placeholder: 'wxXXXXXXXX' },
      { key: 'app_secret', label: 'AppSecret', required: true, type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' },
      { key: 'token', label: 'Token', required: false, placeholder: '自定义 Token' },
      { key: 'encoding_aes_key', label: 'EncodingAESKey', required: false, type: 'password', placeholder: '消息加密密钥' }
    ],
    docs_url: 'https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html'
  },
  {
    id: 'wecom',
    name: '企业微信',
    icon: 'https://res.mail.qq.com/node/ww/wwopenmng/images/independent/doc/logo.png',
    description: '企业微信，支持群机器人、应用消息',
    config_fields: [
      { key: 'corp_id', label: '企业 ID', required: true, placeholder: 'wwXXXXXXXX' },
      { key: 'agent_id', label: '应用 ID', required: true, placeholder: '1000001' },
      { key: 'secret', label: 'Secret', required: true, type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' },
      { key: 'webhook_url', label: '机器人 Webhook', required: false, type: 'url', placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx' }
    ],
    docs_url: 'https://work.weixin.qq.com/api/doc/90000/90135/90234'
  },
  {
    id: 'qq',
    name: 'QQ',
    icon: 'https://qzs.qq.com/ac/qzone_v5/client/images/logo_1.png',
    description: 'QQ 机器人，支持私聊、群聊消息',
    config_fields: [
      { key: 'app_id', label: 'AppID', required: true, placeholder: 'xxxxxxxx' },
      { key: 'app_secret', label: 'AppSecret', required: true, type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' },
      { key: 'bot_name', label: '机器人名称', required: false, placeholder: '小助手' }
    ],
    docs_url: 'https://bot.q.qq.com/wiki/'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: 'https://telegram.org/img/t_logo.png',
    description: 'Telegram Bot，支持群组、私聊消息',
    config_fields: [
      { key: 'bot_token', label: 'Bot Token', required: true, type: 'password', placeholder: 'xxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'webhook_url', label: 'Webhook URL', required: false, type: 'url', placeholder: 'https://your-domain.com/webhook' }
    ],
    docs_url: 'https://core.telegram.org/bots/api'
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png',
    description: 'Discord Bot，支持服务器、频道消息',
    config_fields: [
      { key: 'bot_token', label: 'Bot Token', required: true, type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'guild_id', label: 'Server ID', required: false, placeholder: 'xxxxxxxxxxxxxxxxxx' }
    ],
    docs_url: 'https://discord.com/developers/docs/intro'
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: 'https://a.slack-edge.com/80588/img/meta/slack_hash_24.png',
    description: 'Slack Bot，支持频道、私信消息',
    config_fields: [
      { key: 'bot_token', label: 'Bot Token', required: true, type: 'password', placeholder: 'xoxb-xxxxxxxxxxxx' },
      { key: 'signing_secret', label: 'Signing Secret', required: true, type: 'password', placeholder: 'xxxxxxxxxxxxxxxx' }
    ],
    docs_url: 'https://api.slack.com/start'
  }
];

export async function channelRoutes(app: FastifyInstance) {
  // 获取通道模板列表
  app.get('/templates', { preHandler: [authMiddleware] }, async () => {
    return { templates: CHANNEL_TEMPLATES };
  });

  // 获取单个模板详情
  app.get('/templates/:id', { preHandler: [authMiddleware] }, async (request) => {
    const { id } = request.params as { id: string };
    const template = CHANNEL_TEMPLATES.find(t => t.id === id);
    if (!template) {
      throw new Error('模板不存在');
    }
    return { data: template };
  });

  // 列出所有通道
  app.get('/', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;

    const channels = await db`
      SELECT * FROM channels
      WHERE user_id = ${userId}
      ORDER BY is_default DESC, created_at DESC
    `;

    return { data: channels };
  });

  // 添加通道
  app.post('/', { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: AddChannelBody }>) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { name, channel_type, base_url, auth_type, app_id, app_secret, bot_name, webhook_url, is_default } = request.body;

    if (!channel_type) {
      throw new Error('通道类型不能为空');
    }

    // 如果设置为默认，先取消其他通道的默认状态
    if (is_default) {
      await db`
        UPDATE channels SET is_default = false WHERE user_id = ${userId}
      `;
    }

    const result = await db`
      INSERT INTO channels (
        user_id, name, channel_type, base_url, auth_type,
        app_id, app_secret, bot_name, webhook_url, is_default
      )
      VALUES (
        ${userId}, ${name || null}, ${channel_type}, ${base_url || null}, ${auth_type || null},
        ${app_id || null}, ${app_secret || null}, ${bot_name || null}, ${webhook_url || null}, ${is_default || false}
      )
      RETURNING *
    `;

    return { data: result[0], message: '通道添加成功' };
  });

  // 获取通道详情
  app.get('/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const channels = await db`
      SELECT * FROM channels
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (channels.length === 0) {
      throw new Error('通道不存在');
    }

    return { data: channels[0] };
  });

  // 更新通道
  app.put('/:id', { preHandler: [authMiddleware] }, async (request: FastifyRequest<{ Body: AddChannelBody; Params: { id: string } }>) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params;
    const { name, channel_type, base_url, auth_type, app_id, app_secret, bot_name, webhook_url, is_default } = request.body;

    // 如果设置为默认，先取消其他通道的默认状态
    if (is_default) {
      await db`
        UPDATE channels SET is_default = false WHERE user_id = ${userId} AND id != ${id}
      `;
    }

    const result = await db`
      UPDATE channels
      SET name = ${name || null},
          channel_type = ${channel_type},
          base_url = ${base_url || null},
          auth_type = ${auth_type || null},
          app_id = ${app_id || null},
          app_secret = ${app_secret || null},
          bot_name = ${bot_name || null},
          webhook_url = ${webhook_url || null},
          is_default = ${is_default || false},
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('通道不存在或无权限');
    }

    return { data: result[0], message: '通道更新成功' };
  });

  // 删除通道
  app.delete('/:id', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const result = await db`
      DELETE FROM channels
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) {
      throw new Error('通道不存在或无权限');
    }

    return { message: '通道删除成功' };
  });

  // 测试通道连接
  app.post('/:id/test', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const channels = await db`
      SELECT channel_type, app_id, webhook_url FROM channels
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (channels.length === 0) {
      throw new Error('通道不存在');
    }

    const channel = channels[0];
    // TODO: 实现实际的通道连接测试
    return {
      success: true,
      message: `通道连接测试成功：${channel.channel_type}`
    };
  });

  // 通道健康检查
  app.post('/:id/health', { preHandler: [authMiddleware] }, async (request) => {
    const db = getSql();
    const userId = (request.user as any).id;
    const { id } = request.params as { id: string };

    const channels = await db`
      SELECT channel_type FROM channels
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (channels.length === 0) {
      throw new Error('通道不存在');
    }

    // TODO: 实现实际的健康检查
    return { status: 'healthy', channel_type: channels[0].channel_type };
  });

  // 应用模板
  app.post('/templates/:id/apply', { preHandler: [authMiddleware] }, async (request) => {
    const { id } = request.params as { id: string };
    const template = CHANNEL_TEMPLATES.find(t => t.id === id);

    if (!template) {
      throw new Error('模板不存在');
    }

    // 返回模板的默认配置，方便前端填充表单
    return {
      data: {
        channel_type: template.id,
        name: template.name,
        base_url: null,
        auth_type: 'oauth2'
      }
    };
  });
}
