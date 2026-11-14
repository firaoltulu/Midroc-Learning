import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { config } from './config.js';
import { db } from './core/db/pool.js';
import { errorHandler } from './core/http/error-handler.js';
import { logger } from './core/logger.js';
import { authenticate, requireAdmin } from './modules/auth/index.js';
import { meRoutes, usersAdminRoutes } from './modules/users/index.js';
import { coursesRoutes } from './modules/courses/index.js';
import { enrollmentsAdminRoutes, enrollmentsRoutes } from './modules/enrollments/index.js';
import { contentAdminRoutes, contentRoutes } from './modules/content/index.js';
import { learningRoutes } from './modules/learning/index.js';
import { coursesAdminRoutes } from './modules/courses/index.js';
import { moderationAdminRoutes } from './modules/moderation/index.js';
import { examsRoutes } from './modules/exams/index.js';
import { analyticsAdminRoutes } from './modules/analytics/index.js';
import { editingRoutes } from './modules/editing/index.js';
import { reviewsAdminRoutes, reviewsRoutes } from './modules/reviews/index.js';
import { discussionsRoutes } from './modules/discussions/index.js';
import { notesRoutes } from './modules/notes/index.js';

export function buildApp(authentication: RequestHandler = authenticate): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin is not allowed by CORS'));
        }
      },
      exposedHeaders: ['X-Token-Refresh']
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger,
      genReqId: () => randomUUID(),
      redact: ['req.headers.authorization', 'req.headers.cookie']
    })
  );
  app.get('/api/health', async (_req, res, next) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      message: { error: 'Too many requests', code: 'RATE_LIMITED' }
    })
  );
  app.use('/api', authentication);
  app.use(
    '/api',
    meRoutes,
    coursesRoutes,
    enrollmentsRoutes,
    reviewsRoutes,
    discussionsRoutes,
    notesRoutes,
    editingRoutes,
    contentRoutes,
    learningRoutes,
    examsRoutes
  );

  const adminRoutes = express.Router();
  adminRoutes.use(usersAdminRoutes);
  adminRoutes.use(
    coursesAdminRoutes,
    enrollmentsAdminRoutes,
    moderationAdminRoutes,
    contentAdminRoutes,
    analyticsAdminRoutes,
    reviewsAdminRoutes
  );
  app.use('/api/admin', requireAdmin, adminRoutes);
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });
  app.use(errorHandler);
  return app;
}
