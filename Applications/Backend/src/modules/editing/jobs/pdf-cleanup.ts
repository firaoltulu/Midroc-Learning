import { db } from '../../../core/db/pool.js';
import { logger } from '../../../core/logger.js';
import {
  listPdfFiles,
  listTemporaryPdfFiles,
  removePdf,
  removeTemporaryPdf,
  statPdf,
  statTemporaryPdf
} from '../../../integrations/storage/pdf-storage.js';
import { listReferencedPdfKeys } from '../../content/index.js';
import * as repository from '../editing.jobs.repository.js';

export async function runPdfCleanup(options: { dryRun?: boolean; minimumAgeHours?: number } = {}) {
  const dryRun = options.dryRun ?? false;
  const cutoff = Date.now() - (options.minimumAgeHours ?? 24) * 60 * 60 * 1000;
  const client = await db.connect();
  let locked = false;
  let deleted = 0;
  try {
    locked = await repository.tryPdfCleanupLock(client);
    if (!locked) return { deleted: 0, dryRun };
    const referenced = new Set([
      ...(await listReferencedPdfKeys()),
      ...(await repository.pendingRevisionPdfKeys(client))
    ]);
    for (const fileKey of await listPdfFiles()) {
      const file = await statPdf(fileKey);
      if (file.modifiedAt.getTime() >= cutoff || referenced.has(fileKey)) continue;
      if (dryRun) logger.info({ fileKey }, 'PDF cleanup dry run would delete file');
      else {
        await removePdf(fileKey);
        deleted += 1;
        logger.info({ fileKey }, 'Deleted unreferenced PDF');
      }
    }
    for (const fileName of await listTemporaryPdfFiles()) {
      const file = await statTemporaryPdf(fileName);
      if (file.modifiedAt.getTime() >= cutoff) continue;
      if (dryRun) logger.info({ fileName }, 'PDF cleanup dry run would delete temporary file');
      else {
        await removeTemporaryPdf(fileName);
        deleted += 1;
        logger.info({ fileName }, 'Deleted temporary PDF file');
      }
    }
    return { deleted, dryRun };
  } finally {
    if (locked) await repository.releasePdfCleanupLock(client);
    client.release();
  }
}
