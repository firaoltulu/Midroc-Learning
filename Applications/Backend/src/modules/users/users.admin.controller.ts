import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseInput, routeParam } from '../../core/http/validate.js';
import { paginationOffset } from '../../core/http/pagination.js';
import { roleSchema, statusSchema, usersQuerySchema } from './users.admin.schemas.js';
import * as service from './users.admin.service.js';

function idParam(req: Request): string {
  const id = routeParam(req, 'id');
  if (!isUuid(id)) throw invalidParameter('userId');
  return id;
}

export async function list(req: Request, res: Response): Promise<void> {
  const input = parseInput(usersQuerySchema, req.query);
  const result = await service.listUsers({
    ...input,
    limit: input.pageSize,
    offset: paginationOffset(input)
  });
  res.json({ ...result, page: input.page, pageSize: input.pageSize });
}

export async function detail(req: Request, res: Response): Promise<void> {
  res.json(await service.getUser(idParam(req)));
}

export async function role(req: Request, res: Response): Promise<void> {
  res.json(await service.changeRole(req.user, idParam(req), parseInput(roleSchema, req.body).role));
}

export async function status(req: Request, res: Response): Promise<void> {
  res.json(await service.changeStatus(req.user, idParam(req), parseInput(statusSchema, req.body).status));
}
