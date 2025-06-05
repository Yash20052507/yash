// src/models/Message.ts
import { getPgPool } from '../utils/db';
import { Message, NewMessage } from '../types';
import { logger } from '../utils/logger';

export async function createMessage(newMessage: NewMessage): Promise<Message> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Message>(
      'INSERT INTO messages (session_id, user_id, content, role, token_count, model_used) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        newMessage.session_id,
        newMessage.user_id, // Can be null for AI messages
        newMessage.content,
        newMessage.role,
        newMessage.token_count,
        newMessage.model_used,
      ]
    );
    return res.rows[0];
  } catch (error) {
    logger.error('Error creating message:', error);
    throw error;
  }
}

export async function findMessagesBySessionId(
  sessionId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Message>(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3',
      [sessionId, limit, offset]
    );
    return res.rows;
  } catch (error) {
    logger.error(`Error finding messages for session ID ${sessionId}:`, error);
    throw error;
  }
}

export async function findMessageById(id: string): Promise<Message | null> {
    const pool = getPgPool();
    try {
        const res = await pool.query<Message>('SELECT * FROM messages WHERE id = $1', [id]);
        return res.rows[0] || null;
    } catch (error) {
        logger.error(`Error finding message by ID ${id}:`, error);
        throw error;
    }
}

// Potentially useful for analytics or specific use cases, but not typical CRUD
export async function countMessagesInSession(sessionId: string): Promise<number> {
    const pool = getPgPool();
    try {
        const res = await pool.query<{ count: string }>(
            'SELECT COUNT(*) FROM messages WHERE session_id = $1',
            [sessionId]
        );
        return parseInt(res.rows[0].count, 10);
    } catch (error) {
        logger.error(`Error counting messages in session ID ${sessionId}:`, error);
        throw error;
    }
}

// Deleting messages might be something to consider carefully.
// Usually, messages are kept for history. If deletion is needed:
export async function deleteMessage(id: string): Promise<boolean> {
    const pool = getPgPool();
    try {
        const res = await pool.query('DELETE FROM messages WHERE id = $1', [id]);
        return res.rowCount !== null && res.rowCount > 0;
    } catch (error) {
        logger.error(`Error deleting message ID ${id}:`, error);
        throw error;
    }
}
