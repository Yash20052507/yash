// src/routes/taskRoutes.ts
import { Router } from 'express';
import { param, query } from 'express-validator';
import {
    getTaskStatusController,
    listMyTasksController,
    // getAllTasksAdminController // Would be added if implemented
} from '../controllers/taskController';
import { validate } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// All routes are protected
router.use(authMiddleware);
router.use(apiRateLimiter);

export const taskIdValidationRule = [
    param('taskId').isUUID().withMessage('Task ID must be a valid UUID.'),
];

export const paginationValidationRules = [ // Re-export or import from a shared validation file
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be an integer between 1 and 100.'),
    query('offset').optional().isInt({ min: 0 }).toInt().withMessage('Offset must be a non-negative integer.'),
];

// Route for users to list their own tasks
router.get('/', validate(paginationValidationRules), listMyTasksController);

// Route for users to get status of a specific task they own (or admin for any)
router.get('/:taskId', validate(taskIdValidationRule), getTaskStatusController);

// Example of an admin-only route (if getAllTasksAdminController was fully implemented)
// import { adminAuthMiddleware } from '../middleware/adminAuth'; // Hypothetical admin middleware
// router.get('/admin/all', adminAuthMiddleware, validate(paginationValidationRules), getAllTasksAdminController);

export default router;
