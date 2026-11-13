import { Router } from 'express';
import * as controller from './learning.controller.js';

export const learningRoutes = Router();
learningRoutes.get('/items/:itemId/video', controller.video);
learningRoutes.get('/items/:itemId/pdf', controller.pdf);
learningRoutes.put('/items/:itemId/progress', controller.progress);
