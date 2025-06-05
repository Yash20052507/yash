// src/middleware/index.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from '../config';
import { logger } from '../utils/logger';
// import { apiRateLimiter } from './rateLimit'; // General rate limiter - apply per route or in routes/index.ts

export function setupGlobalMiddleware(app: Express): void {
  // Enable CORS
  app.use(cors({
    origin: config.server.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Added PATCH
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Added X-Requested-With
    credentials: true
  }));

  // HTTP request logging with Morgan, integrate with Winston logger
  const morganStream = {
    write: (message: string) => {
      logger.http(message.trim()); // Log HTTP level messages via Winston
    },
  };
  // Use 'combined' for more detailed logs in production, 'dev' for concise logs in development
  app.use(morgan(config.server.env === 'development' ? 'dev' : 'combined', {
    stream: morganStream,
    // Optionally skip logging for OPTIONS requests or health checks
    // skip: (req, res) => req.method === 'OPTIONS' || req.path === '/api/health'
  }));

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Note: General rate limiters like `apiRateLimiter` are typically applied
  // either to specific routes/routers (like in `authRoutes.ts`) or globally to `/api`
  // in `src/routes/index.ts` if a blanket policy is desired for all API endpoints.
  // Placing it here would make it too broad if this app also serves static files not under /api.
}

// This function will set up error handlers that catch errors *after* routing.
// The error handler in src/routes/index.ts is specific to /api routes.
// This one here can act as a final fallback for any other unhandled errors.
export function setupFinalErrorHandlers(app: Express): void {
    // General Not Found handler for non-API routes or if API 404 is missed
    app.use((req: Request, res: Response, next: NextFunction) => {
        // If the request has already been handled (e.g. by an API route that sent a response),
        // or if it's an API route that should have been caught by the API 404 handler,
        // we don't want to send another 404 here.
        // This primarily catches truly missed routes not starting with /api.
        if (!res.headersSent && !req.path.startsWith('/api')) {
             res.status(404).json({ success: false, error: 'Resource not found.' });
        } else {
            next(); // Pass to next error handler if headersSent or it's an API path
        }
    });

    // Centralized Error Handler - This should be the very last middleware added.
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.error(`Unhandled Application Error: ${err.message}`, {
            stack: config.server.env === 'development' ? err.stack : undefined,
            path: req.path,
            method: req.method,
            errorName: err.name
        });

        if (res.headersSent) {
            return next(err); // Delegate to Express default error handler if response already started
        }

        const statusCode = (err as any).status || (err as any).statusCode || 500;
        // For production, hide detailed error messages for 500 errors
        const message = (config.server.env === 'production' && statusCode === 500)
            ? 'An unexpected internal server error occurred.'
            : err.message || 'Internal Server Error';

        res.status(statusCode).json({
            success: false,
            error: (config.server.env === 'development' || statusCode !== 500) ? err.name : 'ServerError',
            message: message,
            // Optionally include stack trace in development for non-500 errors too if helpful
            ...(config.server.env === 'development' && { stack: err.stack })
        });
    });
}
