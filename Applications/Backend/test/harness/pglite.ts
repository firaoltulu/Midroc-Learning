import { PGlite } from '@electric-sql/pglite';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import type { Database } from '../../src/core/db/pool.js';

export function createPgliteDatabase(): {
  database: Database;
  engine: PGlite;
  close: () => Promise<void>;
} {
  const engine = new PGlite();
  const client = {
    query: async <R extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[]
    ) => (await engine.query<R>(text, values ? [...values] : undefined)) as QueryResult<R>,
    release: () => undefined
  };
  const database = {
    ...client,
    connect: async () => client as unknown as PoolClient,
    end: async () => engine.close()
  } satisfies Database;
  return { database, engine, close: () => engine.close() };
}
