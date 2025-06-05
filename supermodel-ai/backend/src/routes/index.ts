// src/routes/index.ts
import { Express, Response, Request, NextFunction } from 'express';
import authRoutes from './authRoutes';
import sessionRoutes from './sessionRoutes';
import skillPackRoutes from './skillPackRoutes';
import marketplaceRoutes from './marketplaceRoutes';
import taskRoutes from './taskRoutes';
import userRoutes from './userRoutes';
import { logger } from '../utils/logger';
import config from '../config';
import { apiRateLimiter } from '../middleware/rateLimit'; // Import general API rate limiter

export function setupRoutes(app: Express): void {
  // Health check endpoint - generally doesn't need rate limiting but can be added if desired
  app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        environment: config.server.env
    });
  });

  // Apply a general rate limiter to all /api routes if desired as a baseline
  // Specific routes can have stricter limiters (e.g., authRateLimiter on login/register)
  app.use('/api', apiRateLimiter);

  // Mount all the specific API routers
  app.use('/api/auth', authRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/skill-packs', skillPackRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/users', userRoutes);

  // Centralized Not Found handler specifically for /api routes that weren't matched by sub-routers
  app.use('/api/*', (req: Request, res: Response) => {
    logger.warn(`API endpoint not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ success: false, error: 'API endpoint not found.' });
  });

  // Centralized error handler specifically for /api routes
  // This catches errors from any of the API routes mounted above
  app.use('/api', (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`API Error Handler Caught: ${err.message}`, {
        path: req.path,
        method: req.method,
        errorName: err.name,
        // Stack trace only in development for API errors for better debugging
        stack: config.server.env === 'development' ? err.stack : undefined,
    });

    if (res.headersSent) {
        return next(err); // Delegate if response already started
    }

    const statusCode = (err as any).status || (err as any).statusCode || 500;
    const message = (config.server.env === 'production' && statusCode === 500)
        ? 'An internal server error occurred within the API.'
        : err.message || 'API Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: (config.server.env === 'development' || statusCode !== 500) ? err.name : 'ApiServerError',
        message: message,
        // Optionally include stack trace in development for API errors too
        ...(config.server.env === 'development' && { stack: err.stack })
    });
  });
}
