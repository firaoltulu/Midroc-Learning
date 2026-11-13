import { Conflict } from '../../core/http/app-error.js';
import type { Request, Response } from 'express';
import { parseEmptyBody } from '../../core/http/validate.js';
import { listUnavailableVideos, runYoutubeCheck } from './content.jobs.service.js';

export async function unavailable(_req: Request, res: Response): Promise<void> {
  res.json(await listUnavailableVideos());
}

export async function triggerYoutubeCheck(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  const result = await runYoutubeCheck();
  if (result.skipped) throw new Conflict('A YouTube check is already running', 'JOB_ALREADY_RUNNING');
  res.json(result);
}
