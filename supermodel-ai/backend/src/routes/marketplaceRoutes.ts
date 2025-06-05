// src/routes/marketplaceRoutes.ts
import { Router } from 'express';
import { query, param, body } from 'express-validator';
import {
    listPublicSkillPacksController,
    getPublicSkillPackDetailsController,
    acquireSkillPackController,
    getSkillPackReviewsController,
    submitSkillPackReviewController,
    updateMySkillPackReviewController,
    deleteMySkillPackReviewController
} from '../controllers/marketplaceController';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth'; // Needed for acquiring and reviewing
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Publicly accessible routes (read-only parts of marketplace)
router.use(apiRateLimiter); // Apply rate limiter to all marketplace routes

export const paginationAndFilterValidationRules = [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be an integer between 1 and 100.'),
    query('offset').optional().isInt({ min: 0 }).toInt().withMessage('Offset must be a non-negative integer.'),
    query('category').optional().isString().trim().escape(),
    query('search').optional().isString().trim().escape(),
];
router.get('/skill-packs', validate(paginationAndFilterValidationRules), listPublicSkillPacksController);

export const skillPackIdValidationRule = [ // Reusable
    param('skillPackId').isUUID().withMessage('SkillPack ID must be a valid UUID.'),
];
router.get('/skill-packs/:skillPackId', validate(skillPackIdValidationRule), getPublicSkillPackDetailsController);

// Acquiring a skill pack - requires authentication
router.post('/skill-packs/:skillPackId/acquire', authMiddleware, validate(skillPackIdValidationRule), acquireSkillPackController);


// Reviews
router.get('/skill-packs/:skillPackId/reviews', validate([...skillPackIdValidationRule, ...paginationAndFilterValidationRules]), getSkillPackReviewsController);

export const reviewValidationRules = [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5.'),
    body('comment').optional().isString().trim().isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters.'),
];
// Submit review - requires authentication
router.post(
    '/skill-packs/:skillPackId/reviews',
    authMiddleware,
    validate([...skillPackIdValidationRule, ...reviewValidationRules]),
    submitSkillPackReviewController
);

export const reviewIdValidationRule = [
    param('reviewId').isUUID().withMessage('Review ID must be a valid UUID.'),
];
// Update my review - requires authentication
router.patch(
    '/skill-packs/:skillPackId/reviews/:reviewId',
    authMiddleware,
    validate([...skillPackIdValidationRule, ...reviewIdValidationRule, ...reviewValidationRules]),
    updateMySkillPackReviewController
);

// Delete my review (or admin delete) - requires authentication
router.delete(
    '/skill-packs/:skillPackId/reviews/:reviewId',
    authMiddleware,
    validate([...skillPackIdValidationRule, ...reviewIdValidationRule]),
    deleteMySkillPackReviewController
);

export default router;
