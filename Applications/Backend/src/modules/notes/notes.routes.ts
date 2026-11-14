import { Router } from 'express';
import * as controller from './notes.controller.js';

export const notesRoutes = Router();
notesRoutes.get('/items/:itemId/notes', controller.list);
notesRoutes.post('/items/:itemId/notes', controller.create);
notesRoutes.patch('/notes/:noteId', controller.update);
notesRoutes.delete('/notes/:noteId', controller.remove);
