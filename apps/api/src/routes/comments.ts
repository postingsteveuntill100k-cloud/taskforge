import { Router, Response } from 'express';
import { CommentService } from '../services/commentService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const commentsRouter = Router();

commentsRouter.use(authMiddleware);

commentsRouter.patch('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const comment = CommentService.updateComment(req.params.id as string, req.user!.id, req.body);
    res.json(comment);
  } catch (err) {
    next(err);
  }
});

commentsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    CommentService.deleteComment(req.params.id as string, req.user!.id);
    res.json({ message: 'Comment deleted successfully.' });
  } catch (err) {
    next(err);
  }
});
