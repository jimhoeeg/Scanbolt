/**
 * PostgreSQL connection pool + a small typed query helper.
 * Every module imports `query` / `withTransaction` from here so there is a
 * single place that owns connection lifecycle and parameterization.
 */
import { Pool, PoolClient, QueryResultRow } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

/**
 * Run a parameterized query. Generic <T> lets callers type the returned rows.
 * Always pass values via `params` (never string-interpolate) to stay safe
 * from SQL injection.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params as never[]);
  return result.rows;
}

/** Convenience for queries expected to return a single row (or null). */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Run a set of statements inside a transaction. The callback receives a
 * dedicated client; commit/rollback is handled automatically.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
