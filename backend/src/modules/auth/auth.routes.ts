import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getSql } from '../../database';

const registerSchema = z.object({
  account: z.string().min(2).max(20),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  captchaId: z.string(),
  captchaText: z.string(),
});

const loginSchema = z.object({
  account: z.string(),
  password: z.string(),
  captcha: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

// 验证码存储（生产环境应使用 Redis）
const captchaStore = new Map<string, { text: string; expiresAt: number }>();

// 生成简单验证码
function generateCaptcha(): { text: string; data: string; id: string } {
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

  const id = Math.random().toString(36).substring(2, 15);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟过期
  captchaStore.set(id, { text, expiresAt });

  // 清理过期验证码
  setTimeout(() => captchaStore.delete(id), 5 * 60 * 1000);

  return { text, data: Buffer.from(svg).toString('base64'), id };
}

export async function authRoutes(app: FastifyInstance) {
  // 获取验证码
  app.get('/captcha', async (request: FastifyRequest, reply: FastifyReply) => {
    const captcha = generateCaptcha();
    return { image: captcha.data, captchaId: captcha.id };
  });

  // 注册
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);
      const db = getSql();

      // 验证验证码
      const captchaData = captchaStore.get(body.captchaId);
      if (!captchaData) {
        reply.code(400).send({ error: 'Invalid captcha', message: '验证码已过期' });
        return;
      }

      // 不区分大小写验证验证码文本
      if (captchaData.text.toLowerCase() !== body.captchaText.toLowerCase()) {
        reply.code(400).send({ error: 'Invalid captcha', message: '验证码错误' });
        return;
      }

      captchaStore.delete(body.captchaId);

      // 检查邮箱或手机号是否已存在
      const existingUsers = await db`
        SELECT * FROM users
        WHERE email = ${body.email} OR phone = ${body.account}
      `;

      if (existingUsers.length > 0) {
        reply.code(400).send({ error: 'User exists', message: '该邮箱或手机号已注册' });
        return;
      }

      // 密码加密
      const passwordHash = await bcrypt.hash(body.password, 12);

      // 创建用户
      const result = await db`
        INSERT INTO users (email, phone, password_hash)
        VALUES (${body.email || null}, ${body.phone || body.account}, ${passwordHash})
        RETURNING id, email, phone
      `;

      const user = result[0];

      // 创建用户档案
      await db`
        INSERT INTO user_profiles (user_id, nickname)
        VALUES (${user.id}, ${body.account})
      `;

      // 生成 JWT token
      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        phone: user.phone,
      });

      reply.send({
        token,
        expiresIn: '7d',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ error: 'Bad Request', message: err.errors[0].message });
        return;
      }
      console.error('Register error:', err);
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 登录
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      const db = getSql();

      // 从数据库查询用户（支持邮箱、手机号或账号登录）
      // 分别查询避免类型转换错误
      let users: any[] = [];

      // 首先尝试按邮箱或手机号查询
      users = await db`
        SELECT * FROM users
        WHERE email = ${body.account} OR phone = ${body.account}
        LIMIT 1
      `;

      // 如果没有找到且 account 是 UUID 格式，再按 ID 查询
      if (users.length === 0 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.account)) {
        users = await db`
          SELECT * FROM users
          WHERE id = ${body.account}
          LIMIT 1
        `;
      }

      if (users.length === 0) {
        reply.code(401).send({ error: 'Invalid credentials', message: '用户名或密码错误' });
        return;
      }

      const user = users[0];

      // 验证密码
      const validPassword = await bcrypt.compare(body.password, user.password_hash);
      if (!validPassword) {
        reply.code(401).send({ error: 'Invalid credentials', message: '用户名或密码错误' });
        return;
      }

      // 更新最后登录时间
      await db`
        UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}
      `;

      // 生成 JWT token
      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        phone: user.phone,
      });

      reply.send({
        token,
        expiresIn: '7d',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ error: 'Bad Request', message: err.errors[0].message });
        return;
      }
      reply.code(500).send({ error: 'Internal Error', message: err.message });
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
    try {
      const db = getSql();
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'] || '';
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小时过期

      const result = await db`
        INSERT INTO guest_sessions (session_token, ip_address, user_agent, expires_at)
        VALUES (${sessionToken}, ${ipAddress}, ${userAgent}, ${expiresAt})
        RETURNING id, session_token, expires_at
      `;

      reply.send({
        sessionToken: result[0].session_token,
        expiresAt: result[0].expires_at,
      });
    } catch (err: any) {
      console.error('Guest session creation error:', err);
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 访客会话销毁
  app.delete('/guest/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getSql();
      const { token } = request.params as { token: string };

      const result = await db`
        DELETE FROM guest_sessions
        WHERE session_token = ${token}
        RETURNING id
      `;

      if (result.length === 0) {
        reply.code(404).send({ error: 'Not found', message: '访客会话不存在' });
        return;
      }

      reply.send({ message: 'Guest session destroyed' });
    } catch (err: any) {
      console.error('Guest session destruction error:', err);
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 访客会话验证
  app.get('/guest/verify/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = getSql();
      const { token } = request.params as { token: string };

      const sessions = await db`
        SELECT * FROM guest_sessions
        WHERE session_token = ${token} AND expires_at > NOW()
        LIMIT 1
      `;

      if (sessions.length === 0) {
        reply.code(401).send({ error: 'Invalid session', message: '访客会话已过期或不存在' });
        return;
      }

      const session = sessions[0];

      // 更新最后活跃时间
      await db`
        UPDATE guest_sessions SET last_active_at = NOW()
        WHERE session_token = ${token}
      `;

      reply.send({
        valid: true,
        expiresAt: session.expires_at,
        deployProgress: session.deploy_progress,
      });
    } catch (err: any) {
      console.error('Guest session verification error:', err);
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 请求密码重置
  app.post('/forgot-password/request', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = z.object({
        email: z.string().email(),
      }).parse(request.body);

      const db = getSql();

      // 查找用户
      const users = await db`
        SELECT * FROM users
        WHERE email = ${body.email}
        LIMIT 1
      `;

      if (users.length === 0) {
        // 为了安全，不暴露用户是否存在
        reply.send({ message: '如果该邮箱已注册，您将收到重置邮件' });
        return;
      }

      // 生成重置令牌
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 小时过期

      // TODO: 实际应用中应发送邮件，这里临时存储到 guest_sessions 扩展字段
      // 实际应该创建 password_resets 表
      await db`
        INSERT INTO guest_sessions (session_token, ip_address, expires_at, temp_server_ip)
        VALUES (${resetToken}, ${body.email}, ${resetTokenExpires}, 'password_reset')
      `;

      // TODO: 发送邮件
      // await sendPasswordResetEmail(body.email, resetToken);

      console.log(`Password reset token for ${body.email}: ${resetToken}`);

      reply.send({ message: '如果该邮箱已注册，您将收到重置邮件' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ error: 'Bad Request', message: err.errors[0].message });
        return;
      }
      console.error('Password reset request error:', err);
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });

  // 重置密码
  app.post('/forgot-password/reset', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = z.object({
        token: z.string(),
        password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
      }).parse(request.body);

      const db = getSql();

      // 验证重置令牌
      const resetSessions = await db`
        SELECT * FROM guest_sessions
        WHERE session_token = ${body.token}
        AND expires_at > NOW()
        AND temp_server_ip = 'password_reset'
        LIMIT 1
      `;

      if (resetSessions.length === 0) {
        reply.code(400).send({ error: 'Invalid token', message: '重置令牌已过期或无效' });
        return;
      }

      const email = resetSessions[0].ip_address;

      // 查找用户
      const users = await db`
        SELECT * FROM users
        WHERE email = ${email}
        LIMIT 1
      `;

      if (users.length === 0) {
        reply.code(400).send({ error: 'Invalid token', message: '重置令牌已过期或无效' });
        return;
      }

      const user = users[0];

      // 更新密码
      const passwordHash = await bcrypt.hash(body.password, 12);
      await db`
        UPDATE users
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${user.id}
      `;

      // 删除已使用的重置令牌
      await db`
        DELETE FROM guest_sessions
        WHERE session_token = ${body.token}
      `;

      reply.send({ message: '密码已重置' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        reply.code(400).send({ error: 'Bad Request', message: err.errors[0].message });
        return;
      }
      console.error('Password reset error:', err);
      reply.code(500).send({ error: 'Internal Error', message: err.message });
    }
  });
}
