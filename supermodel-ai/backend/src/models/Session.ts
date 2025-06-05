// src/models/Session.ts
import { getPgPool } from '../utils/db';
import { Session, NewSession, SessionUpdate } from '../types';
import { logger } from '../utils/logger';

export async function createSession(newSession: NewSession): Promise<Session> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Session>(
      'INSERT INTO sessions (user_id, name, context_summary) VALUES ($1, $2, $3) RETURNING *',
      [newSession.user_id, newSession.name, newSession.context_summary]
    );
    return res.rows[0];
  } catch (error) {
    logger.error('Error creating session:', error);
    throw error;
  }
}

export async function findSessionById(id: string): Promise<Session | null> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Session>('SELECT * FROM sessions WHERE id = $1', [id]);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error finding session by ID ${id}:`, error);
    throw error;
  }
}

export async function findSessionsByUserId(userId: string): Promise<Session[]> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Session>('SELECT * FROM sessions WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    return res.rows;
  } catch (error) {
    logger.error(`Error finding sessions for user ID ${userId}:`, error);
    throw error;
  }
}

export async function updateSession(id: string, updates: SessionUpdate): Promise<Session | null> {
  const pool = getPgPool();
  const { name, context_summary } = updates;

  const setClauses: string[] = [];
  const values: any[] = [];
  let queryIndex = 1;

  if (name !== undefined) {
    setClauses.push(`name = $${queryIndex++}`);
    values.push(name);
  }
  if (context_summary !== undefined) {
    setClauses.push(`context_summary = $${queryIndex++}`);
    values.push(context_summary);
  }

  if (setClauses.length === 0) {
    logger.info(`No update parameters provided for session ID: ${id}`);
    return findSessionById(id);
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `UPDATE sessions SET ${setClauses.join(', ')} WHERE id = $${queryIndex} RETURNING *`;

  try {
    const res = await pool.query<Session>(query, values);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error updating session ID ${id}:`, error);
    throw error;
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  const pool = getPgPool();
  try {
    const res = await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    return res.rowCount !== null && res.rowCount > 0;
  } catch (error) {
    logger.error(`Error deleting session ID ${id}:`, error);
    throw error;
  }
}

// Add or remove skill packs associated with a session
export async function addSkillPackToSession(sessionId: string, skillPackId: string): Promise<void> {
    const pool = getPgPool();
    try {
        await pool.query(
            'INSERT INTO session_skill_packs (session_id, skill_pack_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [sessionId, skillPackId]
        );
    } catch (error) {
        logger.error(`Error adding skill pack ${skillPackId} to session ${sessionId}:`, error);
        throw error;
    }
}

export async function removeSkillPackFromSession(sessionId: string, skillPackId: string): Promise<void> {
    const pool = getPgPool();
    try {
        await pool.query(
            'DELETE FROM session_skill_packs WHERE session_id = $1 AND skill_pack_id = $2',
            [sessionId, skillPackId]
        );
    } catch (error) {
        logger.error(`Error removing skill pack ${skillPackId} from session ${sessionId}:`, error);
        throw error;
    }
}

export async function getSkillPacksForSession(sessionId: string): Promise<string[]> {
    const pool = getPgPool();
    try {
        const res = await pool.query<{skill_pack_id: string}>(
            'SELECT skill_pack_id FROM session_skill_packs WHERE session_id = $1',
            [sessionId]
        );
        return res.rows.map(row => row.skill_pack_id);
    } catch (error) {
        logger.error(`Error getting skill packs for session ${sessionId}:`, error);
        throw error;
    }
}
