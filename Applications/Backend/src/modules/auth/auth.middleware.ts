import type { NextFunction, Request, Response } from 'express';
import { verifyIdToken, setRoleClaim } from '../../integrations/firebase/firebase.js';
import { Forbidden } from '../../core/http/app-error.js';
import { logger } from '../../core/logger.js';
import { createFromToken } from '../users/index.js';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user: import('../../core/actor.js').Actor;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  let token;
  try {
    token = await verifyIdToken(authorization.slice(7));
  } catch {
    res.status(401).json({ error: 'Invalid authentication token' });
    return;
  }
  if (!token.email) {
    next(new Forbidden('An email address is required'));
    return;
  }
  try {
    const user = await createFromToken({
      uid: token.uid,
      email: token.email,
      emailVerified: token.email_verified === true,
      name: token.name ?? null
    });
    req.user = { id: user.id, role: user.role };
    if (token.role !== user.role) {
      res.setHeader('X-Token-Refresh', 'true');
      try {
        await setRoleClaim(token.uid, user.role);
      } catch (error) {
        logger.warn({ uid: token.uid, err: error }, 'Unable to synchronize Firebase role claim');
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}
