import { Router, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const token = req.headers.authorization?.substring(7) || '';
    await AuthService.logout(token);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const user = await AuthService.getMe(req.user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.patch('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    const updated = await AuthService.updateProfile(req.user.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

