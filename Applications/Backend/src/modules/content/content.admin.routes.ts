import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from './content.admin.controller.js';

export const contentAdminRoutes = Router();
contentAdminRoutes.get('/videos/unavailable', controller.unavailable);
contentAdminRoutes.post(
  '/jobs/youtube-check',
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 3 }),
  controller.triggerYoutubeCheck
);
