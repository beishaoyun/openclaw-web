import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { getSql, testConnection } from './database';

import { authRoutes } from './modules/auth/auth.routes';
import { serverRoutes } from './modules/server/server.routes';
import { openclawRoutes } from './modules/openclaw/openclaw.routes';
import { modelRoutes } from './modules/model/model.routes';
import { channelRoutes } from './modules/channel/channel.routes';
import { skillRoutes } from './modules/skill/skill.routes';
import { adminAuthRoutes } from './modules/admin/admin.routes';
import { adminClientRoutes } from './modules/admin/admin-client.routes';
import { adminTicketRoutes } from './modules/admin/admin-ticket.routes';
import { adminSystemRoutes } from './modules/admin/admin-system.routes';
import { adminLogRoutes } from './modules/admin/admin-log.routes';
import { errorHandler } from './middleware/error';

export async function buildApp(): Promise<FastifyInstance> {
  const app = require('fastify')({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // 数据库连接
  try {
    await testConnection();
    // 将数据库连接注入到 app 实例
    app.decorate('db', getSql());
  } catch (err) {
    console.warn('Database connection failed, running without database:', err);
  }

  // 注册插件
  await app.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret',
    sign: {
      expiresIn: '7d',
    },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 1024 * 1024 * 100, // 100MB limit for OpenClaw packages
    },
  });

  await app.register(rateLimit, {
    max: 500,
    timeWindow: '1 minute',
  });

  await app.register(websocket);

  // 错误处理
  app.setErrorHandler(errorHandler);

  // 健康检查
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API 健康检查（用于 nginx 代理）
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // 注册路由
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(serverRoutes, { prefix: '/api/servers' });
  await app.register(openclawRoutes, { prefix: '/api/openclaw' });
  await app.register(modelRoutes, { prefix: '/api/models' });
  await app.register(channelRoutes, { prefix: '/api/channels' });
  await app.register(skillRoutes, { prefix: '/api/skills' });

  // 管理员路由
  await app.register(adminAuthRoutes, { prefix: '/api/admin/auth' });
  await app.register(adminClientRoutes, { prefix: '/api/admin/clients' });
  await app.register(adminTicketRoutes, { prefix: '/api/admin/tickets' });
  await app.register(adminSystemRoutes, { prefix: '/api/admin/system' });
  await app.register(adminLogRoutes, { prefix: '/api/admin/logs' });

  return app;
}
