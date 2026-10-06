import { Router, Response } from 'express';
import { ProjectService } from '../services/projectService.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const projectsRouter = Router();

projectsRouter.use(authMiddleware);

projectsRouter.get('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const projects = ProjectService.listProjects(req.user!.id);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const project = ProjectService.createProject(req.user!.id, req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

projectsRouter.get('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const project = ProjectService.getProject(req.params.id as string, req.user!.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

projectsRouter.patch('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const project = ProjectService.updateProject(req.params.id as string, req.user!.id, req.body);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

projectsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    ProjectService.deleteProject(req.params.id as string, req.user!.id);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// Member Management Routes
projectsRouter.get('/:id/members', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const members = ProjectService.listMembers(req.params.id as string, req.user!.id);
    res.json(members);
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/:id/members', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const member = ProjectService.addMember(req.params.id as string, req.user!.id, req.body);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

projectsRouter.patch('/:id/members/:userId', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const updated = ProjectService.updateMemberRole(
      req.params.id as string,
      req.user!.id,
      req.params.userId as string,
      req.body.role
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

projectsRouter.delete('/:id/members/:userId', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    ProjectService.removeMember(req.params.id as string, req.user!.id, req.params.userId as string);
    res.json({ message: 'Member removed successfully.' });
  } catch (err) {
    next(err);
  }
});

