import { Router, Response } from 'express';
import { SearchService } from '../services/searchService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { TaskPriority, TaskStatus } from '@taskforge/shared';

export const searchRouter = Router();

searchRouter.use(authMiddleware);

searchRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { q, projectId, status, priority, assigneeId, tag, limit, offset } = req.query;
    const result = SearchService.search(req.user!.id, {
      q: q as string,
      projectId: projectId as string,
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      assigneeId: assigneeId as string,
      tag: tag as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
