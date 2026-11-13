import { db } from '../../../core/db/pool.js';
import { BadGateway, Unprocessable } from '../../../core/http/app-error.js';
import { logger } from '../../../core/logger.js';
import { checkYoutube } from '../../../integrations/youtube/youtube.js';
import * as repository from '../content.jobs.repository.js';

export type YoutubeCheckResult = {
  checked: number;
  available: number;
  newlyUnavailable: number;
  recovered: number;
  stillUnavailable: number;
  unreachable: number;
  aborted: boolean;
  /** Another check holds the lock; nothing was done. */
  skipped: boolean;
};

function emptyResult(): YoutubeCheckResult {
  return {
    checked: 0,
    available: 0,
    newlyUnavailable: 0,
    recovered: 0,
    stillUnavailable: 0,
    unreachable: 0,
    aborted: false,
    skipped: false
  };
}

export async function runYoutubeCheck(options: {
  maxAgeHours?: number;
  batchSize?: number;
  delayMs?: number;
} = {}): Promise<YoutubeCheckResult> {
  const maxAgeHours = options.maxAgeHours ?? 24;
  const batchSize = options.batchSize ?? 200;
  const delayMs = options.delayMs ?? 200;
  const client = await db.connect();
  let locked = false;
  const result = emptyResult();
  try {
    locked = await repository.tryYoutubeJobLock(client);
    if (!locked) return { ...result, skipped: true };
    const videos = await repository.dueYoutubeVideos(client, maxAgeHours, batchSize);
    let consecutiveFailures = 0;
    for (const [index, video] of videos.entries()) {
      result.checked += 1;
      try {
        const metadata = await checkYoutube(video.youtubeVideoId);
        await repository.updateYoutubeAvailability(client, video.youtubeVideoId, true, metadata);
        result.available += 1;
        if (!video.isAvailable) result.recovered += 1;
        consecutiveFailures = 0;
      } catch (error) {
        if (error instanceof Unprocessable) {
          await repository.updateYoutubeAvailability(client, video.youtubeVideoId, false);
          if (video.isAvailable) result.newlyUnavailable += 1;
          else result.stillUnavailable += 1;
          consecutiveFailures = 0;
        } else if (error instanceof BadGateway) {
          result.unreachable += 1;
          consecutiveFailures += 1;
          if (consecutiveFailures >= 5) {
            result.aborted = true;
            break;
          }
        } else {
          throw error;
        }
      }
      if (delayMs > 0 && index < videos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    logger.info(
      { checked: result.checked, available: result.available, unreachable: result.unreachable, aborted: result.aborted },
      'YouTube availability check completed'
    );
    return result;
  } finally {
    if (locked) {
      await repository.releaseYoutubeJobLock(client);
    }
    client.release();
  }
}
