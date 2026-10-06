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

notificationsRouter.post('/check-alerts', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = NotificationService.generateDueDateAlerts(req.user!.id);
    res.json({
      message: 'Due date alerts checked.',
      scanned: result.scanned,
      generated: result.generated,
    });
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

notificationsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    NotificationService.deleteNotification(req.user!.id, req.params.id as string);
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.delete('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    NotificationService.clearAll(req.user!.id);
    res.json({ message: 'All notifications cleared.' });
  } catch (err) {
    next(err);
  }
});
