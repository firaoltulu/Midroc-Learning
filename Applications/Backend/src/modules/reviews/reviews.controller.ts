import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseEmptyBody, parseInput, routeParam } from '../../core/http/validate.js';
import { reviewInputSchema, reviewListQuerySchema } from './reviews.schemas.js';
import * as service from './reviews.service.js';

function courseId(req: Request): string {
  const id = routeParam(req, 'id');
  if (!isUuid(id)) throw invalidParameter('courseId');
  return id;
}

export async function list(req: Request, res: Response): Promise<void> {
  const input = parseInput(reviewListQuerySchema, req.query);
  res.json(await service.listReviews(req.user, courseId(req), input));
}

export async function save(req: Request, res: Response): Promise<void> {
  const { created, review } = await service.saveReview(
    req.user,
    courseId(req),
    parseInput(reviewInputSchema, req.body)
  );
  res.status(created ? 201 : 200).json(review);
}

export async function adminRemove(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  const reviewId = routeParam(req, 'reviewId');
  if (!isUuid(reviewId)) throw invalidParameter('reviewId');
  await service.removeReview(reviewId);
  res.status(204).end();
}

export async function remove(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await service.deleteReview(req.user, courseId(req));
  res.status(204).end();
}
