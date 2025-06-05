// src/models/Task.ts
import { getPgPool } from '../utils/db';
import { Task, NewTask, TaskUpdate } from '../types';
import { logger } from '../utils/logger';

export async function createTask(newTask: NewTask): Promise<Task> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Task>(
      'INSERT INTO tasks (user_id, type, status, progress, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        newTask.user_id,
        newTask.type,
        newTask.status ?? 'queued', // Default to 'queued' if not specified
        newTask.progress ?? 0,
        newTask.metadata ? JSON.stringify(newTask.metadata) : null,
      ]
    );
    return res.rows[0];
  } catch (error) {
    logger.error('Error creating task:', error);
    throw error;
  }
}

export async function findTaskById(id: string): Promise<Task | null> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Task>('SELECT * FROM tasks WHERE id = $1', [id]);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error finding task by ID ${id}:`, error);
    throw error;
  }
}

export async function findTasksByUserId(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Task[]> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Task>(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return res.rows;
  } catch (error) {
    logger.error(`Error finding tasks for user ID ${userId}:`, error);
    throw error;
  }
}

export async function findTasksByStatus(
  status: Task['status'],
  limit: number = 10
): Promise<Task[]> {
  const pool = getPgPool();
  try {
    // Fetches tasks by status, useful for workers picking up jobs
    const res = await pool.query<Task>(
      'SELECT * FROM tasks WHERE status = $1 ORDER BY created_at ASC LIMIT $2 FOR UPDATE SKIP LOCKED',
      // FOR UPDATE SKIP LOCKED is to prevent multiple workers from picking up the same task.
      // This is PostgreSQL specific. For other DBs, different locking mechanisms would be needed.
      [status, limit]
    );
    return res.rows;
  } catch (error) {
    logger.error(`Error finding tasks by status ${status}:`, error);
    throw error;
  }
}

export async function updateTask(id: string, updates: TaskUpdate): Promise<Task | null> {
  const pool = getPgPool();
  const { status, progress, result, error_message, completed_at, metadata } = updates;

  const setClauses: string[] = [];
  const values: any[] = [];
  let queryIndex = 1;

  if (status !== undefined) { setClauses.push(`status = $${queryIndex++}`); values.push(status); }
  if (progress !== undefined) { setClauses.push(`progress = $${queryIndex++}`); values.push(progress); }
  if (result !== undefined) { setClauses.push(`result = $${queryIndex++}`); values.push(JSON.stringify(result)); }
  if (error_message !== undefined) { setClauses.push(`error_message = $${queryIndex++}`); values.push(error_message); }
  if (completed_at !== undefined) { setClauses.push(`completed_at = $${queryIndex++}`); values.push(completed_at); }
   if (metadata !== undefined) { setClauses.push(`metadata = $${queryIndex++}`); values.push(JSON.stringify(metadata)); }


  if (setClauses.length === 0) {
    logger.info(`No update parameters provided for task ID: ${id}`);
    return findTaskById(id);
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${queryIndex} RETURNING *`;

  try {
    const res = await pool.query<Task>(query, values);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error updating task ID ${id}:`, error);
    throw error;
  }
}

// Claim a task to prevent other workers from picking it up
// This is an alternative to FOR UPDATE SKIP LOCKED if you want to mark it in the application layer
export async function claimTask(id: string, workerId: string): Promise<Task | null> {
    const pool = getPgPool();
    try {
        // The metadata field would store which worker claimed it.
        // This is a simplified example. A robust system might have a dedicated worker_id column.
        const res = await pool.query<Task>(
            `UPDATE tasks
             SET status = 'processing', metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{worker_id}', $1::jsonb, true), updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND status = 'queued'
             RETURNING *`,
            [`"${workerId}"`, id] // Ensure workerId is a JSON string if metadata is JSONB
        );
        return res.rows[0] || null;
    } catch (error) {
        logger.error(`Error claiming task ID ${id} by worker ${workerId}:`, error);
        throw error;
    }
}


export async function deleteTask(id: string): Promise<boolean> {
  const pool = getPgPool();
  try {
    const res = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return res.rowCount !== null && res.rowCount > 0;
  } catch (error) {
    logger.error(`Error deleting task ID ${id}:`, error);
    throw error;
  }
}
