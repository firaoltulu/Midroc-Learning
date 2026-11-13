import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseInput, routeParam } from '../../core/http/validate.js';
import { config } from '../../config.js';
import { accelPath, pdfPathForInternalUse } from '../../integrations/storage/pdf-storage.js';
import * as service from './learning.service.js';
import { progressSchema } from './learning.schemas.js';

function itemId(req: Request): string {
  const id = routeParam(req, 'itemId');
  if (!isUuid(id)) throw invalidParameter('itemId');
  return id;
}

export async function video(req: Request, res: Response): Promise<void> {
  const video = await service.videoForLearner(itemId(req), req.user);
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(video);
}

export async function pdf(req: Request, res: Response): Promise<void> {
  const fileKey = await service.pdfForLearner(itemId(req), req.user);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/pdf');
  if (config.PDF_DELIVERY === 'stream') {
    await new Promise<void>((resolve, reject) => {
      res.sendFile(pdfPathForInternalUse(fileKey), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    return;
  }
  res.setHeader('X-Accel-Redirect', accelPath(fileKey));
  res.status(200).end();
}

export async function progress(req: Request, res: Response): Promise<void> {
  await service.updateProgress(req.user, itemId(req), parseInput(progressSchema, req.body));
  res.status(204).end();
}
