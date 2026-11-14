import { Router } from 'express';
import * as controller from './courses.controller.js';

/** Read-only, without sign-in (mounted before authentication): the guest home page. */
export const coursesPublicRoutes = Router();
coursesPublicRoutes.get('/courses/categories', controller.categories);
coursesPublicRoutes.get('/courses', controller.publicCatalog);
