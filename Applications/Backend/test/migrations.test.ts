import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPgliteDatabase } from './harness/pglite.js';

describe('reference migrations', () => {
  it('apply in order and preserve deferred reorder constraints', async () => {
    const { engine, close } = createPgliteDatabase();
    try {
      for (const filename of [
        '001_init.sql',
        '002_course_content.sql',
        '003_youtube_video.sql',
        '004_course_language.sql'
      ]) {
        const sql = await readFile(path.join('migrations', filename), 'utf8');
        await engine.exec(sql);
      }
      const { rows } = await engine.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'video_items'`
      );
      expect(rows.map((row) => row.column_name)).toContain('youtube_video_id');
      const { rows: courseColumns } = await engine.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'courses'`
      );
      expect(courseColumns.map((row) => row.column_name)).toContain('language');
      const { rows: constraints } = await engine.query<{ is_deferrable: string }>(
        `SELECT is_deferrable FROM information_schema.table_constraints
         WHERE table_name = 'module_items' AND constraint_type = 'UNIQUE'`
      );
      expect(constraints.some((row) => row.is_deferrable === 'YES')).toBe(true);
    } finally {
      await close();
    }
  });
});
