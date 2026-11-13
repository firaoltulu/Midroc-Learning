import { db } from '../../core/db/pool.js';
import * as repository from './content.jobs.repository.js';
import { runYoutubeCheck } from './jobs/youtube-check.js';

export async function listUnavailableVideos() {
  return repository.unavailableYoutubeVideos(db);
}

export { runYoutubeCheck };
