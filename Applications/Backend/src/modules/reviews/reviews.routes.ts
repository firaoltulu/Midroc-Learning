import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from './reviews.controller.js';

export const reviewsRoutes = Router();
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });
reviewsRoutes.get('/courses/:id/reviews', controller.list);
reviewsRoutes.put('/courses/:id/review', writeLimiter, controller.save);
reviewsRoutes.delete('/courses/:id/review', writeLimiter, controller.remove);
