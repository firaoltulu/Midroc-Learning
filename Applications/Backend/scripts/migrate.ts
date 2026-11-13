import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/core/db/pool.js';

const migrationDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));

async function main(): Promise<void> {
  const client = await db.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const filenames = (await readdir(migrationDirectory))
      .filter((filename) => /^\d+_.+\.sql$/.test(filename))
      .sort();
    const { rows } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations'
    );
    const applied = new Set(rows.map((row) => row.filename));

    for (const filename of filenames) {
      if (applied.has(filename)) continue;
      const source = await readFile(path.join(migrationDirectory, filename), 'utf8');
      const statements = source
        .replace(/^\s*BEGIN\s*;\s*/i, '')
        .replace(/\s*COMMIT\s*;\s*$/i, '');
      await client.query('BEGIN');
      try {
        await client.query(statements);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.info(`Applied ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed', error);
  process.exitCode = 1;
});
