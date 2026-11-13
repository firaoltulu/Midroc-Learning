import type { Request, Response } from 'express';
import { parseEmptyBody } from '../../core/http/validate.js';
import { listUnavailableVideos, runYoutubeCheck } from './content.jobs.service.js';

export async function unavailable(_req: Request, res: Response): Promise<void> {
  res.json(await listUnavailableVideos());
}

export async function triggerYoutubeCheck(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  res.json(await runYoutubeCheck());
}
