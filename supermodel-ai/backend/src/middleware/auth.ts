// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { findUserById } from '../models/User'; // Ensure User model is created
import { User } from '../types';
import { logger } from '../utils/logger'; // Assuming logger is in src/utils/logger.ts

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; iat: number; exp: number }; // Standard JWT payload

    // Check if token is expired (though jwt.verify should do this)
    if (decoded.exp * 1000 < Date.now()) {
        logger.warn(`Expired token received for user ID: ${decoded.userId}`);
        res.status(401).json({ success: false, error: 'Unauthorized: Token expired' });
        return;
    }

    const user = await findUserById(decoded.userId);

    if (!user) {
      logger.warn(`User not found for ID in token: ${decoded.userId}`);
      res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
      return;
    }

    req.user = user; // Attach user object (without password_hash) to request
    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
        logger.warn('JWT verification failed: Token expired');
        res.status(401).json({ success: false, error: 'Unauthorized: Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('JWT verification failed: Invalid token');
        res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    } else {
        logger.error('JWT verification failed with unexpected error:', error);
        res.status(500).json({ success: false, error: 'Internal server error during token verification' });
    }
  }
}
