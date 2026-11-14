import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { runYoutubeCheck } from '../src/modules/content/jobs/youtube-check.js';
import { createPgliteDatabase } from './harness/pglite.js';

const ownerId = 'c5c53f56-bb74-4cd7-98c4-a6bbb9ac7e68';
const courseId = 'c8929b64-76d2-4799-af60-09d35e314f60';
const moduleId = 'a2aa2739-dd1a-47cb-bc56-af0032663924';
const videoIds = ['a1B2c3D4e5F', 'b1B2c3D4e5F', 'c1B2c3D4e5F', 'd1B2c3D4e5F', 'e1B2c3D4e5F'];

describe('YouTube availability job', () => {
  let closeDatabase: (() => Promise<void>) | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    setDatabaseForTests(undefined);
    await closeDatabase?.();
    closeDatabase = undefined;
  });

  async function setup(ids: string[]) {
    const pglite = createPgliteDatabase();
    closeDatabase = pglite.close;
    setDatabaseForTests(pglite.database);
    for (const migration of [
      '001_init.sql',
      '002_course_content.sql',
      '003_youtube_video.sql',
      '004_course_language.sql',
      '005_course_details.sql'
    ]) {
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }
    await db.query(
      `INSERT INTO users (id, firebase_uid, email) VALUES ($1, 'owner-firebase', 'owner@example.test')`,
      [ownerId]
    );
    await db.query(
      `INSERT INTO courses (id, owner_id, title, status) VALUES ($1, $2, 'Video course', 'published')`,
      [courseId, ownerId]
    );
    await db.query(
      `INSERT INTO modules (id, course_id, title, position) VALUES ($1, $2, 'Videos', 0)`,
      [moduleId, courseId]
    );
    for (const [position, youtubeVideoId] of ids.entries()) {
      const itemId = `7b95012b-b597-4d4e-a5bb-cb367b324e${String(position).padStart(2, '0')}`;
      await db.query(
        `INSERT INTO module_items (id, module_id, type, title, position)
         VALUES ($1, $2, 'video', 'Video', $3)`,
        [itemId, moduleId, position]
      );
      await db.query(
        'INSERT INTO video_items (item_id, youtube_video_id) VALUES ($1, $2)',
        [itemId, youtubeVideoId]
      );
    }
    return pglite;
  }

  it('deduplicates video ids and updates availability from oEmbed', async () => {
    await setup([videoIds[0]!, videoIds[0]!]);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ title: 'Video', thumbnail_url: 'https://img.example.test/a.jpg' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    const result = await runYoutubeCheck({ delayMs: 0 });
    expect(result).toMatchObject({ checked: 1, available: 1, unreachable: 0, aborted: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { rows } = await db.query<{ available: boolean; title: string }>(
      `SELECT bool_and(is_available) AS available, max(youtube_title) AS title FROM video_items`
    );
    expect(rows[0]).toMatchObject({ available: true, title: 'Video' });
  });

  it('leaves network failures untouched and aborts after five consecutive failures', async () => {
    await setup(videoIds);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));
    const result = await runYoutubeCheck({ delayMs: 0 });
    expect(result).toMatchObject({ checked: 5, unreachable: 5, aborted: true });
    const { rows } = await db.query<{ unchecked: boolean }>(
      `SELECT bool_and(last_checked_at IS NULL) AS unchecked FROM video_items`
    );
    expect(rows[0]?.unchecked).toBe(true);
  });
});
