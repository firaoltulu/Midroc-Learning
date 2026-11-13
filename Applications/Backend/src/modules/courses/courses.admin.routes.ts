import { Router } from 'express';
import { courseAdminList } from './courses.admin.controller.js';

export const coursesAdminRoutes = Router();
coursesAdminRoutes.get('/courses', courseAdminList);
