import { Router, Response } from 'express';
import { ActivityService } from '../services/activityService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const activityRouter = Router();

activityRouter.use(authMiddleware);

activityRouter.get('/projects/:id/audit-export', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const csv = ActivityService.getProjectActivityCsv(req.params.id as string);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${req.params.id}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

activityRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { projectId, taskId, limit } = req.query;
    const events = ActivityService.listActivity(req.user!.id, {
      projectId: projectId as string,
      taskId: taskId as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
});
