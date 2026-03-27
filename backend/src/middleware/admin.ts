import { FastifyRequest, FastifyReply } from 'fastify';

export async function adminAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();

    // 检查是否是管理员
    const user = request.user as any;
    if (!user || !user.isAdmin) {
      reply.code(403).send({ error: 'Forbidden', message: 'Admin access required' });
      return;
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    return;
  }
}

export async function superAdminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();

    const user = request.user as any;
    if (!user || !user.isAdmin || user.role !== 'super_admin') {
      reply.code(403).send({ error: 'Forbidden', message: 'Super admin access required' });
      return;
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    return;
  }
}
