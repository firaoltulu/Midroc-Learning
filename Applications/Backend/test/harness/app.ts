import type { RequestHandler } from 'express';
import { buildApp } from '../../src/app.js';

const testAuthenticate: RequestHandler = (req, res, next) => {
  const identity = req.header('x-user');
  const match = identity?.match(/^([0-9a-f-]{36}):(user|admin)$/i);
  if (!match) {
    res.status(401).json({ error: 'Test identity required' });
    return;
  }
  req.user = { id: match[1]!, role: match[2] as 'user' | 'admin' };
  next();
};

export function buildTestApp() {
  return buildApp(testAuthenticate);
}

export function asUser(id: string, role: 'user' | 'admin' = 'user') {
  return { headers: { 'x-user': `${id}:${role}` } };
}
