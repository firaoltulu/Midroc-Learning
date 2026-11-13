import pg, { type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { config } from '../../config.js';

const { Pool } = pg;

export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<R>>;
}

export interface Database extends Queryable {
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
}

const pool = new Pool({ connectionString: config.DATABASE_URL });
let override: Database | undefined;

export const db: Database = {
  query: (text, values) => (override ?? pool).query(text, values),
  connect: () => (override ?? pool).connect(),
  end: () => (override ?? pool).end()
};

export function setDatabaseForTests(database: Database | undefined): void {
  if (config.NODE_ENV !== 'test') {
    throw new Error('Database overrides are only available in test mode');
  }
  override = database;
}

export { pool };
