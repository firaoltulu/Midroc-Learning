import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from './enrollments.controller.js';

export const enrollmentsRoutes = Router();
const enrollLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });
enrollmentsRoutes.post('/courses/:id/enroll', enrollLimiter, controller.enroll);
enrollmentsRoutes.delete('/courses/:id/enroll', controller.unenroll);
enrollmentsRoutes.get('/me/enrollments', controller.mine);
