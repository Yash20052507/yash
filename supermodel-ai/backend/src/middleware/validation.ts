// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, matchedData } from 'express-validator';
import { logger } from '../utils/logger';

// Extend Express Request type to include validatedData
declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}

// Middleware to run validation chains and handle errors
export const validate = (validations: ValidationChain[], sanitize: boolean = true) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      if (sanitize) {
        // Attach sanitized and validated data to the request object
        req.validatedData = matchedData(req);
      }
      return next();
    }

    logger.warn('Validation errors:', { errors: errors.array(), path: req.path });
    res.status(400).json({ success: false, errors: errors.array() });
  };
};

// Example specific validators (can be moved to a dedicated validation schema file or per-route basis)
// These are just examples, actual validators will be defined closer to their usage in route/controller files.
/*
import { body, param, query } from 'express-validator';

export const createUserValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('username').isString().trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
];

export const loginUserValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const objectIdParamValidation = (paramName: string) => [
  param(paramName).isMongoId().withMessage(`Parameter '${paramName}' must be a valid MongoDB ObjectId`),
];

export const paginationQueryValidation = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
];
*/
