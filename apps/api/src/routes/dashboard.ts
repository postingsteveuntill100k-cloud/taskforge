import { Router, Response } from 'express';
import { DashboardService } from '../services/dashboardService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

dashboardRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { projectId } = req.query;
    const stats = DashboardService.getDashboardStats(req.user!.id, projectId as string);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});
