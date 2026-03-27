import { getSql, testConnection } from './index';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration(filename: string) {
  const db = getSql();

  try {
    console.log(`Running migration: ${filename}`);

    const sqlPath = join(__dirname, '../../migrations', filename);
    const sql = readFileSync(sqlPath, 'utf-8');

    // 使用 postgres 包的简单执行方式
    await db.unsafe(sql);

    console.log(`Migration ${filename} completed successfully`);
  } catch (err) {
    console.error(`Migration ${filename} failed:`, err);
    throw err;
  }
}

async function main() {
  try {
    await testConnection();

    // 按顺序执行迁移
    await runMigration('001_initial.sql');
    await runMigration('002_admin.sql');

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
