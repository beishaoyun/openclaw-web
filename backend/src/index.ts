import 'dotenv/config';
import { buildApp } from './app';

async function main() {
  const app = await buildApp();

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = '0.0.0.0';

  try {
    await app.listen({ port, host });
    console.log(`🚀 Server running at http://${host}:${port}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
