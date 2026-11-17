import type { QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it } from 'vitest';
import type { Queryable } from '../../core/db/pool.js';
import { listItems } from './content.authoring.repository.js';

describe('authoring content repository', () => {
  it('converts PostgreSQL bigint PDF sizes into safe API numbers', async () => {
    const row = {
      id: 'item-id',
      type: 'pdf',
      title: 'PDF',
      position: 0,
      youtubeVideoId: null,
      youtubeTitle: null,
      isAvailable: null,
      fileKey: 'file.pdf',
      sizeBytes: '1048576',
      pageCount: 2,
      instructions: null,
      passingScorePercent: null,
      maxAttempts: null,
      timeLimitMinutes: null
    };
    const database: Queryable = {
      async query<R extends QueryResultRow>(): Promise<QueryResult<R>> {
        return {
          rows: [row] as unknown as R[],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        };
      }
    };

    await expect(listItems(database, 'module-id')).resolves.toEqual([
      expect.objectContaining({ sizeBytes: 1_048_576 })
    ]);
  });
});
