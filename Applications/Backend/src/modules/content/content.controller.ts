import type { Request, Response } from 'express';
import { BadRequest } from '../../core/http/app-error.js';
import { uploadPdf as uploadPdfFile } from './content.service.js';

export async function uploadPdf(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new BadRequest('A PDF file is required');
  res.status(201).json(await uploadPdfFile(req.file.buffer));
}
