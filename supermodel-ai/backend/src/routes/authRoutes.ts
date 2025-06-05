// src/routes/authRoutes.ts
import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getCurrentUser } from '../controllers/authController';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { apiRateLimiter, authRateLimiter } from '../middleware/rateLimit';

const router = Router();

export const registerValidationRules = [
  body('email').isEmail().withMessage('Must be a valid email').normalizeEmail(),
  body('username').isString().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters long.'),
  body('password').isString().isLength({ min: 6, max: 100 }).withMessage('Password must be 6-100 characters long.'),
];

export const loginValidationRules = [
  body('email').isEmail().withMessage('Must be a valid email').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required.'),
];

// Apply general rate limiter to all auth routes first
router.use(apiRateLimiter);

// Then apply stricter rate limiter for register and login specifically
router.post('/register', authRateLimiter, validate(registerValidationRules), register);
router.post('/login', authRateLimiter, validate(loginValidationRules), login);

// Protected route, requires valid JWT
router.get('/me', authMiddleware, getCurrentUser);

export default router;
