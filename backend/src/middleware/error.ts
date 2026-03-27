import { FastifyError } from 'fastify';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

export async function errorHandler(
  error: FastifyError,
  _req: any,
  reply: any
) {
  const response: ErrorResponse = {
    statusCode: error.statusCode || 500,
    error: error.name || 'Internal Server Error',
    message: error.message || 'An unexpected error occurred',
  };

  // 不要在生产环境暴露堆栈信息
  if (process.env.NODE_ENV !== 'production') {
    (response as any).stack = error.stack;
  }

  reply.status(response.statusCode).send(response);
}
