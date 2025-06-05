// src/models/SkillPack.ts
import { getPgPool } from '../utils/db';
import {
    SkillPack, NewSkillPack, SkillPackUpdate,
    UserSkillPack,
    SkillPackReview, NewSkillPackReview, SkillPackReviewUpdate
} from '../types';
import { logger } from '../utils/logger';

// --- SkillPack Functions ---

export async function createSkillPack(newSkillPack: NewSkillPack): Promise<SkillPack> {
  const pool = getPgPool();
  try {
    const res = await pool.query<SkillPack>(
      'INSERT INTO skill_packs (name, description, category, author_id, version, price_credits, is_public, content_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        newSkillPack.name,
        newSkillPack.description,
        newSkillPack.category,
        newSkillPack.author_id,
        newSkillPack.version ?? '1.0.0',
        newSkillPack.price_credits ?? 0,
        newSkillPack.is_public ?? true,
        newSkillPack.content_hash,
      ]
    );
    return res.rows[0];
  } catch (error) {
    logger.error('Error creating skill pack:', error);
    throw error;
  }
}

export async function findSkillPackById(id: string): Promise<SkillPack | null> {
  const pool = getPgPool();
  try {
    const res = await pool.query<SkillPack>('SELECT * FROM skill_packs WHERE id = $1', [id]);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error finding skill pack by ID ${id}:`, error);
    throw error;
  }
}

export async function findSkillPacksByAuthorId(authorId: string): Promise<SkillPack[]> {
  const pool = getPgPool();
  try {
    const res = await pool.query<SkillPack>('SELECT * FROM skill_packs WHERE author_id = $1 ORDER BY updated_at DESC', [authorId]);
    return res.rows;
  } catch (error) {
    logger.error(`Error finding skill packs for author ID ${authorId}:`, error);
    throw error;
  }
}

export async function findPublicSkillPacks(limit: number = 20, offset: number = 0): Promise<SkillPack[]> {
    const pool = getPgPool();
    try {
        const res = await pool.query<SkillPack>(
            'SELECT * FROM skill_packs WHERE is_public = TRUE ORDER BY rating DESC, download_count DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        return res.rows;
    } catch (error) {
        logger.error('Error finding public skill packs:', error);
        throw error;
    }
}

export async function updateSkillPack(id: string, updates: SkillPackUpdate): Promise<SkillPack | null> {
  const pool = getPgPool();
  const { name, description, category, version, price_credits, is_public, content_hash, rating, download_count } = updates;

  const setClauses: string[] = [];
  const values: any[] = [];
  let queryIndex = 1;

  if (name !== undefined) { setClauses.push(`name = $${queryIndex++}`); values.push(name); }
  if (description !== undefined) { setClauses.push(`description = $${queryIndex++}`); values.push(description); }
  if (category !== undefined) { setClauses.push(`category = $${queryIndex++}`); values.push(category); }
  if (version !== undefined) { setClauses.push(`version = $${queryIndex++}`); values.push(version); }
  if (price_credits !== undefined) { setClauses.push(`price_credits = $${queryIndex++}`); values.push(price_credits); }
  if (is_public !== undefined) { setClauses.push(`is_public = $${queryIndex++}`); values.push(is_public); }
  if (content_hash !== undefined) { setClauses.push(`content_hash = $${queryIndex++}`); values.push(content_hash); }
  if (rating !== undefined) { setClauses.push(`rating = $${queryIndex++}`); values.push(rating); } // Usually updated by reviews aggregate
  if (download_count !== undefined) { setClauses.push(`download_count = $${queryIndex++}`); values.push(download_count); }


  if (setClauses.length === 0) {
    logger.info(`No update parameters provided for skill pack ID: ${id}`);
    return findSkillPackById(id);
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `UPDATE skill_packs SET ${setClauses.join(', ')} WHERE id = $${queryIndex} RETURNING *`;

  try {
    const res = await pool.query<SkillPack>(query, values);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error updating skill pack ID ${id}:`, error);
    throw error;
  }
}

export async function deleteSkillPack(id: string): Promise<boolean> {
  const pool = getPgPool();
  // Consider implications: what happens to users who acquired it? Reviews?
  // อาจจะต้องมี soft delete หรือ checks เพิ่มเติม
  try {
    const res = await pool.query('DELETE FROM skill_packs WHERE id = $1', [id]);
    return res.rowCount !== null && res.rowCount > 0;
  } catch (error) {
    logger.error(`Error deleting skill pack ID ${id}:`, error);
    throw error;
  }
}

// --- UserSkillPack Functions (Acquiring/Managing User's Skill Packs) ---

export async function addUserSkillPack(userId: string, skillPackId: string): Promise<UserSkillPack> {
    const pool = getPgPool();
    try {
        const res = await pool.query<UserSkillPack>(
            'INSERT INTO user_skill_packs (user_id, skill_pack_id) VALUES ($1, $2) ON CONFLICT (user_id, skill_pack_id) DO NOTHING RETURNING *',
            [userId, skillPackId]
        );
        if (res.rows.length > 0) {
             // Increment download count (can be done via trigger or here)
            await pool.query('UPDATE skill_packs SET download_count = download_count + 1 WHERE id = $1', [skillPackId]);
            return res.rows[0];
        }
        // If conflict and nothing inserted, fetch existing
        const existing = await pool.query<UserSkillPack>('SELECT * FROM user_skill_packs WHERE user_id = $1 AND skill_pack_id = $2', [userId, skillPackId]);
        return existing.rows[0];

    } catch (error) {
        logger.error(`Error adding skill pack ${skillPackId} for user ${userId}:`, error);
        throw error;
    }
}

export async function findUserSkillPack(userId: string, skillPackId: string): Promise<UserSkillPack | null> {
    const pool = getPgPool();
    try {
        const res = await pool.query<UserSkillPack>(
            'SELECT * FROM user_skill_packs WHERE user_id = $1 AND skill_pack_id = $2',
            [userId, skillPackId]
        );
        return res.rows[0] || null;
    } catch (error) {
        logger.error(`Error finding user skill pack for user ${userId} and skill pack ${skillPackId}:`, error);
        throw error;
    }
}

export async function findSkillPacksByUserId(userId: string): Promise<SkillPack[]> {
    const pool = getPgPool();
    try {
        // Join user_skill_packs with skill_packs to get full skill pack details
        const res = await pool.query<SkillPack>(
            `SELECT sp.*
             FROM skill_packs sp
             JOIN user_skill_packs usp ON sp.id = usp.skill_pack_id
             WHERE usp.user_id = $1`,
            [userId]
        );
        return res.rows;
    } catch (error) {
        logger.error(`Error finding skill packs for user ID ${userId}:`, error);
        throw error;
    }
}

// --- SkillPackReview Functions ---

export async function createSkillPackReview(newReview: NewSkillPackReview): Promise<SkillPackReview> {
    const pool = getPgPool();
    try {
        const res = await pool.query<SkillPackReview>(
            'INSERT INTO skill_pack_reviews (skill_pack_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
            [newReview.skill_pack_id, newReview.user_id, newReview.rating, newReview.comment]
        );
        // After adding a review, you might want to update the skill_pack's average rating
        await updateSkillPackRating(newReview.skill_pack_id);
        return res.rows[0];
    } catch (error) {
        logger.error(`Error creating review for skill pack ${newReview.skill_pack_id} by user ${newReview.user_id}:`, error);
        throw error;
    }
}

export async function findReviewsBySkillPackId(skillPackId: string, limit: number = 10, offset: number = 0): Promise<SkillPackReview[]> {
    const pool = getPgPool();
    try {
        const res = await pool.query<SkillPackReview>(
            'SELECT * FROM skill_pack_reviews WHERE skill_pack_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [skillPackId, limit, offset]
        );
        return res.rows;
    } catch (error) {
        logger.error(`Error finding reviews for skill pack ID ${skillPackId}:`, error);
        throw error;
    }
}

export async function updateSkillPackReview(id: string, updates: SkillPackReviewUpdate): Promise<SkillPackReview | null> {
    const pool = getPgPool();
    const { rating, comment } = updates;

    const setClauses: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    if (rating !== undefined) { setClauses.push(`rating = $${queryIndex++}`); values.push(rating); }
    if (comment !== undefined) { setClauses.push(`comment = $${queryIndex++}`); values.push(comment); }

    if (setClauses.length === 0) {
        logger.info(`No update parameters provided for review ID: ${id}`);
        const currentReview = await pool.query<SkillPackReview>('SELECT * FROM skill_pack_reviews WHERE id = $1', [id]);
        return currentReview.rows[0] || null;
    }

    values.push(id);
    const query = `UPDATE skill_pack_reviews SET ${setClauses.join(', ')} WHERE id = $${queryIndex} RETURNING *`;

    try {
        const res = await pool.query<SkillPackReview>(query, values);
        if (res.rows[0]) {
            // After updating a review, also update the skill_pack's average rating
            await updateSkillPackRating(res.rows[0].skill_pack_id);
        }
        return res.rows[0] || null;
    } catch (error) {
        logger.error(`Error updating review ID ${id}:`, error);
        throw error;
    }
}

async function updateSkillPackRating(skillPackId: string): Promise<void> {
    const pool = getPgPool();
    try {
        // Calculate average rating and update the skill_packs table
        await pool.query(
            `UPDATE skill_packs sp
             SET rating = (
                SELECT AVG(spr.rating)
                FROM skill_pack_reviews spr
                WHERE spr.skill_pack_id = sp.id
             )
             WHERE sp.id = $1`,
            [skillPackId]
        );
    } catch (error) {
        logger.error(`Error updating rating for skill pack ID ${skillPackId}:`, error);
        // Not throwing here as it's a secondary effect
    }
}

export async function deleteSkillPackReview(id: string): Promise<boolean> {
    const pool = getPgPool();
    try {
        // Fetch the review first to know which skill pack rating to update
        const reviewRes = await pool.query<{ skill_pack_id: string }>('SELECT skill_pack_id FROM skill_pack_reviews WHERE id = $1', [id]);
        const skillPackId = reviewRes.rows[0]?.skill_pack_id;

        const deleteRes = await pool.query('DELETE FROM skill_pack_reviews WHERE id = $1', [id]);

        if (deleteRes.rowCount !== null && deleteRes.rowCount > 0 && skillPackId) {
            await updateSkillPackRating(skillPackId);
            return true;
        }
        return false;
    } catch (error) {
        logger.error(`Error deleting review ID ${id}:`, error);
        throw error;
    }
}
