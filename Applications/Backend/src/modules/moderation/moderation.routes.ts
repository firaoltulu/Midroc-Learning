import { Router } from 'express';
import * as controller from './moderation.controller.js';

export const moderationAdminRoutes = Router();
moderationAdminRoutes.get('/moderation', controller.queue);
moderationAdminRoutes.post('/courses/:id/approve', controller.approve);
moderationAdminRoutes.post('/courses/:id/reject', controller.reject);
moderationAdminRoutes.get('/revisions/:id', controller.revisionDiff);
moderationAdminRoutes.post('/revisions/:id/approve', controller.approveRevision);
moderationAdminRoutes.post('/revisions/:id/reject', controller.rejectRevision);
