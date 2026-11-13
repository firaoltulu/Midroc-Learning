import { Router } from 'express';
import { getMe } from './users.controller.js';

export const meRoutes = Router();
meRoutes.get('/me', getMe);
