import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from './exams.controller.js';

export const examsRoutes = Router();
const attemptStartLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });
examsRoutes.get('/exams/:examId', controller.getExam);
examsRoutes.post('/exams/:examId/start', attemptStartLimiter, controller.start);
examsRoutes.post('/attempts/:attemptId/submit', controller.submit);
examsRoutes.get('/exams/:examId/attempts', controller.history);
