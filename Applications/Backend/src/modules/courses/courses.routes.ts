import { Router } from 'express';
import * as controller from './courses.controller.js';

export const coursesRoutes = Router();
coursesRoutes.get('/courses/categories', controller.categories);
coursesRoutes.get('/courses', controller.catalog);
coursesRoutes.get('/courses/:id', controller.detail);
coursesRoutes.get('/me/courses', controller.mine);
coursesRoutes.post('/courses', controller.create);
coursesRoutes.post('/courses/:id/submit', controller.submit);
coursesRoutes.delete('/courses/:id', controller.remove);
