import postgres from 'postgres';

let sql: postgres.Sql | null = null;

export function getSql(): postgres.Sql {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    sql = postgres(connectionString, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 2,
    });
  }

  return sql;
}

export async function closeSql(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

export async function testConnection(): Promise<void> {
  try {
    const db = getSql();
    const result = await db`SELECT NOW() as now`;
    console.log('Database connected successfully:', result[0]?.now);
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
}
