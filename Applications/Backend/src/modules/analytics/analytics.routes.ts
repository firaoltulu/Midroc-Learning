import { Router } from 'express';
import * as controller from './analytics.controller.js';

export const analyticsAdminRoutes = Router();
analyticsAdminRoutes.get('/analytics/overview', controller.overview);
analyticsAdminRoutes.get('/analytics/enrollments', controller.enrollments);
analyticsAdminRoutes.get('/analytics/courses', controller.courses);
analyticsAdminRoutes.get('/analytics/courses/:courseId', controller.course);
