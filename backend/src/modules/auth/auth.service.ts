// 认证服务
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateCaptcha(): { code: string; image: string } {
  // TODO: 实现图形验证码生成
  const code = Math.random().toString().slice(2, 6);
  return { code, image: 'data:image/png;base64,...' };
}
