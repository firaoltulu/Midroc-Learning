import type { PoolClient } from 'pg';
import { db, type Queryable } from './pool.js';

export async function withTx<T>(callback: (client: PoolClient & Queryable) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
