import { buildApp } from './app.js';
import { config } from './config.js';
import { db } from './core/db/pool.js';
import { logger } from './core/logger.js';
import { startJobs } from './jobs.js';

const app = buildApp();
const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Learning platform API listening');
});
const stopJobs = await startJobs();
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  server.close(async (error) => {
    try {
      await stopJobs();
      await db.end();
    } catch (shutdownError) {
      logger.error({ err: shutdownError }, 'Shutdown cleanup failed');
      process.exitCode = 1;
    }
    if (error) {
      logger.error({ err: error }, 'HTTP server did not close cleanly');
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
