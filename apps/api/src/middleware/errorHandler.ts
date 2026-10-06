import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[API ERROR] ${req.method} ${req.url} [${status}]:`, err);

  res.status(status).json({
    error: message,
    details: process.env.NODE_ENV === 'production' ? undefined : err.details || err.stack,
  });
}
