import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from './discussions.controller.js';

export const discussionsRoutes = Router();
const postLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 });
discussionsRoutes.get('/items/:itemId/discussions', controller.threads);
discussionsRoutes.post('/items/:itemId/discussions', postLimiter, controller.startThread);
discussionsRoutes.get('/discussions/:postId/replies', controller.replies);
discussionsRoutes.post('/discussions/:postId/replies', postLimiter, controller.reply);
discussionsRoutes.delete('/discussions/:postId', controller.remove);
