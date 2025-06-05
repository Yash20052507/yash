// src/routes/userRoutes.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
    getUserProfile,
    updateUserProfile,
    listApiKeys,
    generateApiKey,
    deleteApiKey,
    listUserTransactions
} from '../controllers/userController';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// All routes in this file are protected and require authentication
router.use(authMiddleware);
router.use(apiRateLimiter);

// User Profile routes
router.get('/profile', getUserProfile);

export const updateUserProfileValidationRules = [
    body('username').optional().isString().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters.'),
    body('email').optional().isEmail().withMessage('Must be a valid email.').normalizeEmail(),
    body('password').optional().isString().isLength({ min: 6, max: 100 }).withMessage('Password must be 6-100 characters.'),
    // is_admin and credits are intentionally not updatable here by user
];
router.patch('/profile', validate(updateUserProfileValidationRules), updateUserProfile);


// API Key routes
router.get('/api-keys', listApiKeys);

export const generateApiKeyValidationRules = [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('API key name must be 1-100 characters.'),
    body('expires_at').optional().isISO8601().toDate().withMessage('Expiration date must be a valid ISO 8601 date string.'),
];
router.post('/api-keys', validate(generateApiKeyValidationRules), generateApiKey);

export const objectIdInParamValidation = (paramName: string) => [ // Reusable for UUIDs from PG as well
    param(paramName).isUUID().withMessage(`Parameter '${paramName}' must be a valid UUID.`),
];
router.delete('/api-keys/:apiKeyId', validate(objectIdInParamValidation('apiKeyId')), deleteApiKey);


// Transaction routes
export const paginationValidationRules = [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be an integer between 1 and 100.'),
    query('offset').optional().isInt({ min: 0 }).toInt().withMessage('Offset must be a non-negative integer.'),
];
router.get('/transactions', validate(paginationValidationRules), listUserTransactions);

export default router;
