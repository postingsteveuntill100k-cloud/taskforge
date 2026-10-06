import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import { getDb } from '../db/index.js';
import { UserSafe } from '@taskforge/shared';

export interface AuthenticatedRequest extends Request {
  user?: UserSafe;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { userId: string; email: string };
    const db = getDb();
    const user = db.prepare(`
      SELECT id, email, name, avatar_url, role, created_at
      FROM users WHERE id = ?
    `).get(decoded.userId) as UserSafe | undefined;

    if (!user) {
      res.status(401).json({ error: 'User account not found or deactivated.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireProjectMember(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const projectId = req.params.projectId || req.body?.project_id || req.query?.projectId;
  const user = req.user;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required.' });
    return;
  }

  if (!user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const db = getDb();
  const membership = db.prepare(`
    SELECT role FROM project_members
    WHERE project_id = ? AND user_id = ?
  `).get(projectId, user.id);

  if (!membership && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
    return;
  }

  next();
}
