// src/routes/skillPackRoutes.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import {
    listMySkillPacks,
    getMySkillPackDetails,
    createNewSkillPack,
    updateMySkillPack,
    deleteMySkillPack,
    triggerSkillPackEmbedding
} from '../controllers/skillPackController';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// All routes are protected and for user's own skill packs
router.use(authMiddleware);
router.use(apiRateLimiter);

// SkillPack Content Data validation (reusable part for create/update)
// This is a simplified example. A real implementation would need to validate
// the structure of examples, templates, prompt_templates, etc. more deeply.
const skillPackContentDataValidation = [
    body('content.instructions').optional().isString().trim(),
    body('content.knowledge_base_summary').optional().isString().trim(),
    body('content.examples').optional().isArray().withMessage('Examples must be an array.'),
    body('content.examples.*.input').optional().isString().withMessage('Example input must be a string.'),
    body('content.examples.*.output').optional().isString().withMessage('Example output must be a string.'),
    body('content.templates').optional().isArray().withMessage('Templates must be an array.'),
    body('content.templates.*.name').optional().isString().withMessage('Template name must be a string.'),
    body('content.templates.*.code').optional().isString().withMessage('Template code must be a string.'),
    body('content.prompt_templates').optional().isArray().withMessage('Prompt templates must be an array.'),
    body('content.prompt_templates.*.name').optional().isString().withMessage('Prompt template name must be a string.'),
    body('content.prompt_templates.*.template').optional().isString().withMessage('Prompt template must be a string.'),
];


export const createSkillPackValidationRules = [
    body('name').isString().trim().isLength({ min: 3, max: 100 }).withMessage('Skill pack name must be 3-100 characters.'),
    body('description').optional().isString().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),
    body('category').optional().isString().trim().isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters.'),
    body('version').optional().isString().trim().matches(/^(\d+\.\d+\.\d+)$/).withMessage('Version must be semantic (e.g., 1.0.0).'),
    body('price_credits').optional().isInt({ min: 0 }).withMessage('Price credits must be a non-negative integer.'),
    body('is_public').optional().isBoolean().withMessage('is_public must be true or false.'),
    ...skillPackContentDataValidation // Include content validation
];

router.get('/', listMySkillPacks);
router.post('/', validate(createSkillPackValidationRules, true), createNewSkillPack); // true for req.validatedData

export const skillPackIdValidationRule = [ // Reusable
    param('skillPackId').isUUID().withMessage('SkillPack ID must be a valid UUID.'),
];

router.get('/:skillPackId', validate(skillPackIdValidationRule), getMySkillPackDetails);

export const updateSkillPackValidationRules = [
    body('name').optional().isString().trim().isLength({ min: 3, max: 100 }).withMessage('Skill pack name must be 3-100 characters.'),
    body('description').optional().isString().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters.'),
    body('category').optional().isString().trim().isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters.'),
    body('version').optional().isString().trim().matches(/^(\d+\.\d+\.\d+)$/).withMessage('Version must be semantic (e.g., 1.0.0).'),
    body('price_credits').optional().isInt({ min: 0 }).withMessage('Price credits must be a non-negative integer.'),
    body('is_public').optional().isBoolean().withMessage('is_public must be true or false.'),
    ...skillPackContentDataValidation // Include content validation
];
router.patch('/:skillPackId', validate([...skillPackIdValidationRule, ...updateSkillPackValidationRules], true), updateMySkillPack);

router.delete('/:skillPackId', validate(skillPackIdValidationRule), deleteMySkillPack);

// Trigger embedding generation
router.post('/:skillPackId/generate-embeddings', validate(skillPackIdValidationRule), triggerSkillPackEmbedding);


export default router;
