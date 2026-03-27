import { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      email?: string;
      isGuest?: boolean;
      isAdmin?: boolean;
      role?: string;
    };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export async function guestAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionToken = request.headers['x-guest-token'] as string;

  if (!sessionToken) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Guest token required' });
    return;
  }

  // TODO: 验证访客会话
  request.user = { id: '', isGuest: true };
}
