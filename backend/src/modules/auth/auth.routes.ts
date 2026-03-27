import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const registerSchema = z.object({
  account: z.string().min(2).max(20),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  captcha: z.string().length(4).optional(),
});

const loginSchema = z.object({
  account: z.string(),
  password: z.string(),
  captcha: z.string().length(4).optional(),
  rememberMe: z.boolean().optional(),
});

// 生成简单验证码
function generateCaptcha(): { text: string; data: string } {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < 4; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // 生成简单的 SVG 验证码图片
  const bgColors = ['#f0f9ff', '#fef3c7', '#f0fdf4', '#fdf2f8', '#faf5ff'];
  const textColors = ['#0369a1', '#b45309', '#15803d', '#be185d', '#6b21a8'];
  const bgColor = bgColors[Math.floor(Math.random() * bgColors.length)];
  const textColor = textColors[Math.floor(Math.random() * textColors.length)];

  const svg = `
    <svg width="100" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="40" fill="${bgColor}"/>
      <text x="50" y="28" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="${textColor}" letter-spacing="4">${text}</text>
      <line x1="10" y1="10" x2="90" y2="30" stroke="${textColor}" stroke-width="1" opacity="0.3"/>
      <line x1="10" y1="30" x2="90" y2="10" stroke="${textColor}" stroke-width="1" opacity="0.3"/>
      <circle cx="25" cy="15" r="2" fill="${textColor}" opacity="0.5"/>
      <circle cx="50" cy="25" r="2" fill="${textColor}" opacity="0.5"/>
      <circle cx="75" cy="15" r="2" fill="${textColor}" opacity="0.5"/>
    </svg>
  `;

  return { text, data: Buffer.from(svg).toString('base64') };
}

export async function authRoutes(app: FastifyInstance) {
  // 获取验证码
  app.get('/captcha', async (request: FastifyRequest, reply: FastifyReply) => {
    const captcha = generateCaptcha();
    // 实际应该存储 captcha.text 用于验证，这里临时不验证
    return { image: captcha.data };
  });
  // 注册
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      // TODO: 实现注册逻辑
      reply.send({ message: 'Registration successful' });
    } catch (err: any) {
      reply.code(400).send({ error: 'Bad Request', message: err.message });
    }
  });

  // 登录
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      // TODO: 实现登录逻辑
      const token = app.jwt.sign({ id: 'user-id', email: 'test@example.com' });
      reply.send({ token, expiresIn: '7d' });
    } catch (err: any) {
      reply.code(400).send({ error: 'Bad Request', message: err.message });
    }
  });

  // 登出
  app.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: 实现登出逻辑（token 黑名单）
    reply.send({ message: 'Logout successful' });
  });

  // 刷新令牌
  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const token = app.jwt.sign({ id: request.user!.id });
      reply.send({ token, expiresIn: '7d' });
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' });
    }
  });

  // 访客会话创建
  app.post('/guest/start', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: 创建访客会话
    const sessionToken = 'guest-session-token';
    reply.send({ sessionToken, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  });

  // 访客会话销毁
  app.delete('/guest/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: 销毁访客会话
    reply.send({ message: 'Guest session destroyed' });
  });
}
