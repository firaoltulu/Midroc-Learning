import { Router } from 'express';
import * as controller from './editing.controller.js';

export const editingRoutes = Router();
editingRoutes.patch('/courses/:id', controller.patchCourse);
editingRoutes.get('/courses/:courseId/revision', controller.courseRevision);
editingRoutes.put('/courses/:courseId/revision', controller.saveCourseRevision);
editingRoutes.delete('/courses/:courseId/revision', controller.deleteCourseRevision);
