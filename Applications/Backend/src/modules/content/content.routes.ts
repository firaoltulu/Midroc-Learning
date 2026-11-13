import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { uploadPdf } from './content.controller.js';
import * as authoring from './content.authoring.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }
});

export const contentRoutes = Router();
contentRoutes.get('/courses/:courseId/authoring', authoring.authoring);
contentRoutes.post('/courses/:courseId/modules', authoring.createModule);
contentRoutes.put('/courses/:courseId/modules/order', authoring.reorderModules);
contentRoutes.patch('/modules/:moduleId', authoring.patchModule);
contentRoutes.delete('/modules/:moduleId', authoring.deleteModule);
contentRoutes.post('/modules/:moduleId/items', authoring.createItem);
contentRoutes.put('/modules/:moduleId/items/order', authoring.reorderItems);
contentRoutes.patch('/items/:itemId', authoring.patchItem);
contentRoutes.delete('/items/:itemId', authoring.deleteItem);
contentRoutes.put('/items/:itemId/questions', authoring.replaceQuestions);
contentRoutes.post(
  '/pdf-uploads',
  rateLimit({ windowMs: 60 * 60 * 1000, limit: 20 }),
  upload.single('file'),
  uploadPdf
);
