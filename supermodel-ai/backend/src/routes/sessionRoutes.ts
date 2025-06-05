// src/routes/sessionRoutes.ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
    getAllSessions,
    getSessionDetails,
    createNewSession,
    updateExistingSession,
    deleteExistingSession,
    getSessionMessages,
    postMessageToSession,
    getSessionSkillPacks,
    addSkillPackToCurrentSession,
    removeSkillPackFromCurrentSession
} from '../controllers/sessionController';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// All routes in this file are protected and require authentication
router.use(authMiddleware);
router.use(apiRateLimiter);

// Session CRUD
router.get('/', getAllSessions);

export const createSessionValidationRules = [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Session name must be 1-100 characters.'),
    body('context_summary').optional().isString().trim().isLength({ max: 500 }).withMessage('Context summary cannot exceed 500 characters.'),
];
router.post('/', validate(createSessionValidationRules), createNewSession);

export const sessionIdValidationRule = [
    param('sessionId').isUUID().withMessage('Session ID must be a valid UUID.'),
];

router.get('/:sessionId', validate(sessionIdValidationRule), getSessionDetails);

export const updateSessionValidationRules = [
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Session name must be 1-100 characters.'),
    body('context_summary').optional().isString().trim().isLength({ max: 500 }).withMessage('Context summary cannot exceed 500 characters.'),
];
router.patch('/:sessionId', validate([...sessionIdValidationRule, ...updateSessionValidationRules]), updateExistingSession);

router.delete('/:sessionId', validate(sessionIdValidationRule), deleteExistingSession);


// Messages within a Session
export const paginationValidationRules = [ // Re-export or import from a shared validation file if used elsewhere
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be an integer between 1 and 100.'),
    query('offset').optional().isInt({ min: 0 }).toInt().withMessage('Offset must be a non-negative integer.'),
];
router.get('/:sessionId/messages', validate([...sessionIdValidationRule, ...paginationValidationRules]), getSessionMessages);

export const postMessageValidationRules = [
    body('content').isString().trim().notEmpty().withMessage('Message content cannot be empty.'),
    // 'role' is handled by the controller, users can only post as 'user'
];
router.post('/:sessionId/messages', validate([...sessionIdValidationRule, ...postMessageValidationRules]), postMessageToSession);


// SkillPacks within a Session
export const skillPackIdValidationRule = [ // Assuming skillPackId is also a UUID
    param('skillPackId').isUUID().withMessage('SkillPack ID must be a valid UUID.'),
];

router.get('/:sessionId/skill-packs', validate(sessionIdValidationRule), getSessionSkillPacks);
router.post('/:sessionId/skill-packs/:skillPackId', validate([...sessionIdValidationRule, ...skillPackIdValidationRule]), addSkillPackToCurrentSession);
router.delete('/:sessionId/skill-packs/:skillPackId', validate([...sessionIdValidationRule, ...skillPackIdValidationRule]), removeSkillPackFromCurrentSession);

export default router;
