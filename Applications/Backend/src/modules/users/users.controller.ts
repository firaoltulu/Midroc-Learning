import type { Request, Response } from 'express';
import { getById } from './users.service.js';

export async function getMe(req: Request, res: Response): Promise<void> {
  res.json(await getById(req.user.id));
}
