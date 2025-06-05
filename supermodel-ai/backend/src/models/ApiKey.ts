// src/models/ApiKey.ts
import { getPgPool } from '../utils/db';
import { ApiKey, NewApiKey, ApiKeyUpdate } from '../types';
import { logger } from '../utils/logger';

// Note: The actual API key is received, hashed, and then the hash is stored.
// The original key is shown to the user once upon creation and not stored by us.

export async function createApiKey(newApiKey: NewApiKey): Promise<ApiKey> {
  const pool = getPgPool();
  try {
    const res = await pool.query<ApiKey>(
      'INSERT INTO api_keys (user_id, key_hash, name, expires_at) VALUES ($1, $2, $3, $4) RETURNING id, user_id, name, last_used_at, expires_at, created_at',
      // We don't return key_hash to the application layer after creation for security.
      // The service layer that calls this would have the original key to show the user if needed.
      [
        newApiKey.user_id,
        newApiKey.key_hash, // This is the HASH of the key
        newApiKey.name,
        newApiKey.expires_at,
      ]
    );
    return res.rows[0];
  } catch (error) {
    logger.error('Error creating API key:', error);
    throw error;
  }
}

export async function findApiKeyById(id: string): Promise<ApiKey | null> {
  const pool = getPgPool();
  try {
    // key_hash is not selected to avoid exposing it unnecessarily
    const res = await pool.query<ApiKey>(
        'SELECT id, user_id, name, last_used_at, expires_at, created_at FROM api_keys WHERE id = $1',
        [id]
    );
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error finding API key by ID ${id}:`, error);
    throw error;
  }
}

export async function findApiKeyByKeyHash(keyHash: string): Promise<ApiKey | null> {
  const pool = getPgPool();
  try {
    // This is used during authentication of an API key. We need the full record here.
    const res = await pool.query<ApiKey>('SELECT * FROM api_keys WHERE key_hash = $1', [keyHash]);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error finding API key by hash:`, error); // Avoid logging the hash itself
    throw error;
  }
}

export async function findApiKeysByUserId(userId: string): Promise<ApiKey[]> {
  const pool = getPgPool();
  try {
    // key_hash is not selected
    const res = await pool.query<ApiKey>(
      'SELECT id, user_id, name, last_used_at, expires_at, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows;
  } catch (error) {
    logger.error(`Error finding API keys for user ID ${userId}:`, error);
    throw error;
  }
}

export async function updateApiKey(id: string, updates: ApiKeyUpdate): Promise<ApiKey | null> {
  const pool = getPgPool();
  const { name, last_used_at } = updates;

  const setClauses: string[] = [];
  const values: any[] = [];
  let queryIndex = 1;

  if (name !== undefined) {
    setClauses.push(`name = $${queryIndex++}`);
    values.push(name);
  }
  if (last_used_at !== undefined) {
    setClauses.push(`last_used_at = $${queryIndex++}`);
    values.push(last_used_at);
  }
  // expires_at could be updatable too, if business logic allows extending/changing expiration

  if (setClauses.length === 0) {
    logger.info(`No update parameters provided for API key ID: ${id}`);
    return findApiKeyById(id);
  }

  values.push(id);
  // key_hash is not returned
  const query = `UPDATE api_keys SET ${setClauses.join(', ')} WHERE id = $${queryIndex} RETURNING id, user_id, name, last_used_at, expires_at, created_at`;

  try {
    const res = await pool.query<ApiKey>(query, values);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error updating API key ID ${id}:`, error);
    throw error;
  }
}

export async function recordApiKeyUsage(id: string): Promise<void> {
    const pool = getPgPool();
    try {
        await pool.query(
            "UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1",
            [id]
        );
    } catch (error) {
        logger.error(`Error recording API key usage for ID ${id}:`, error);
        // Non-critical error, don't necessarily throw
    }
}


export async function deleteApiKey(id: string): Promise<boolean> {
  const pool = getPgPool();
  try {
    const res = await pool.query('DELETE FROM api_keys WHERE id = $1', [id]);
    return res.rowCount !== null && res.rowCount > 0;
  } catch (error) {
    logger.error(`Error deleting API key ID ${id}:`, error);
    throw error;
  }
}
