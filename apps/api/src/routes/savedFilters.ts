import { Router, Response } from 'express';
import { SavedFilterService } from '../services/savedFilterService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const savedFiltersRouter = Router();

savedFiltersRouter.use(authMiddleware);

savedFiltersRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const filters = SavedFilterService.list(req.user!.id, projectId);
    res.json(filters);
  } catch (err) {
    next(err);
  }
});

savedFiltersRouter.post('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const filter = SavedFilterService.create(req.user!.id, req.body);
    res.status(201).json(filter);
  } catch (err) {
    next(err);
  }
});

savedFiltersRouter.delete('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    SavedFilterService.delete(req.params.id as string, req.user!.id);
    res.json({ message: 'Saved filter deleted successfully.' });
  } catch (err) {
    next(err);
  }
});
