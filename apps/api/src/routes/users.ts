import { Router, Response } from 'express';
import { UserService } from '../services/userService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(authMiddleware);

usersRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const q = req.query.q as string | undefined;
    const users = UserService.listUsers(q);
    res.json(users);
  } catch (err) {
    next(err);
  }
});
