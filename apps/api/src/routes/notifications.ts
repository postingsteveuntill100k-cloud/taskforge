import { Router, Response } from 'express';
import { NotificationService } from '../services/notificationService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);

notificationsRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const list = NotificationService.listNotifications(req.user!.id);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.patch('/:id/read', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    NotificationService.markAsRead(req.user!.id, req.params.id as string);
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/read-all', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    NotificationService.markAllAsRead(req.user!.id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});
