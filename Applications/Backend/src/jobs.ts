import { config } from './config.js';
import { logger } from './core/logger.js';
import { runYoutubeCheck } from './modules/content/index.js';
import { runPdfCleanup } from './modules/editing/index.js';

export type JobStop = () => Promise<void>;

export async function startJobs(): Promise<JobStop> {
  const timers: NodeJS.Timeout[] = [];
  if (config.YOUTUBE_CHECK_INTERVAL_HOURS > 0) {
    const interval = setInterval(() => {
      void runYoutubeCheck().catch((error: unknown) => {
        logger.error({ err: error }, 'Scheduled YouTube check failed');
      });
    }, config.YOUTUBE_CHECK_INTERVAL_HOURS * 60 * 60 * 1000);
    interval.unref();
    timers.push(interval);
  }
  const pdfCleanup = setInterval(() => {
    void runPdfCleanup({ dryRun: config.PDF_CLEANUP_DRY_RUN }).catch((error: unknown) => {
      logger.error({ err: error }, 'Scheduled PDF cleanup failed');
    });
  }, 24 * 60 * 60 * 1000);
  pdfCleanup.unref();
  timers.push(pdfCleanup);
  return async () => {
    for (const timer of timers) clearInterval(timer);
  };
}
