import { Router } from 'express';
import * as controller from './users.admin.controller.js';

export const usersAdminRoutes = Router();
usersAdminRoutes.get('/users', controller.list);
usersAdminRoutes.get('/users/:id', controller.detail);
usersAdminRoutes.patch('/users/:id/role', controller.role);
usersAdminRoutes.patch('/users/:id/status', controller.status);
