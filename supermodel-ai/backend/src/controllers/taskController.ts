// src/controllers/taskController.ts
import { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import { findTaskById, findTasksByUserId, Task } from '../models/Task';
import { User } from '../types';
import { logger } from '../utils/logger';

export async function getTaskStatusController(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { taskId } = matchedData(req, { locations: ['params'] });

    try {
        const task = await findTaskById(taskId);

        if (!task) {
            res.status(404).json({ success: false, error: 'Task not found.' });
            return;
        }

        // Users can only see their own tasks, unless they are admin
        if (task.user_id !== user.id && !user.is_admin) {
            res.status(403).json({ success: false, error: 'Access denied to this task.' });
            return;
        }

        res.status(200).json({ success: true, data: task });
    } catch (error: any) {
        logger.error(`Error fetching task ${taskId} for user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to fetch task status.' });
    }
}

export async function listMyTasksController(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { limit = '20', offset = '0' } = req.query; // Get pagination from query

    try {
        const tasks: Task[] = await findTasksByUserId(user.id, parseInt(limit as string), parseInt(offset as string));
        // Could also return total count for pagination UI
        res.status(200).json({ success: true, data: tasks });
    } catch (error: any) {
        logger.error(`Error listing tasks for user ID ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Server error listing tasks.' });
    }
}

// Admin functionality (example - could be in a separate adminController.ts)
export async function getAllTasksAdminController(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    if (!user.is_admin) {
        res.status(403).json({ success: false, error: 'Forbidden: Admin access required.' });
        return;
    }
    // This would need a model function like `findAllTasks` with pagination
    // For now, this is a placeholder.
    logger.info(`Admin ${user.username} requesting all tasks.`);
    res.status(501).json({ success: false, error: 'Not Implemented: Admin view all tasks.' });
}
