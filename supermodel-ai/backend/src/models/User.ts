// src/models/User.ts
import { getPgPool } from '../utils/db';
import { hashPassword } from '../utils/auth'; // Already created in utils/auth.ts
import { User, NewUser, UserUpdate } from '../types'; // Already created in types/index.ts
import { logger } from '../utils/logger';

export async function createUser(newUser: NewUser): Promise<User> {
  const pool = getPgPool();
  const hashedPassword = await hashPassword(newUser.password);
  const res = await pool.query<User>(
    'INSERT INTO users (username, email, password_hash, credits, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, credits, is_admin, created_at, updated_at',
    [newUser.username, newUser.email, hashedPassword, newUser.credits ?? 100, newUser.is_admin ?? false]
  );
  // Ensure password_hash is not returned
  return res.rows[0];
}

export async function findUserById(id: string): Promise<User | null> {
  const pool = getPgPool();
  const res = await pool.query<User>('SELECT id, username, email, credits, is_admin, created_at, updated_at FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const pool = getPgPool();
  // Return the full user object for password verification during login
  const res = await pool.query<User>('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0] || null;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const pool = getPgPool();
  // Return the full user object for password verification during login, if username is used for login
  const res = await pool.query<User>('SELECT * FROM users WHERE username = $1', [username]);
  return res.rows[0] || null;
}

export async function updateUser(id: string, updates: UserUpdate): Promise<User | null> {
  const pool = getPgPool();
  const { username, email, password, credits, is_admin } = updates;

  const setClauses: string[] = [];
  const values: any[] = [];
  let queryIndex = 1;

  if (username !== undefined) {
    setClauses.push(`username = $${queryIndex++}`);
    values.push(username);
  }
  if (email !== undefined) {
    setClauses.push(`email = $${queryIndex++}`);
    values.push(email);
  }
  if (password !== undefined) {
    const hashedPassword = await hashPassword(password);
    setClauses.push(`password_hash = $${queryIndex++}`);
    values.push(hashedPassword);
  }
  if (credits !== undefined) {
    setClauses.push(`credits = $${queryIndex++}`);
    values.push(credits);
  }
  if (is_admin !== undefined) {
    setClauses.push(`is_admin = $${queryIndex++}`);
    values.push(is_admin);
  }

  if (setClauses.length === 0) {
    logger.info(`No update parameters provided for user ID: ${id}`);
    return findUserById(id); // No actual updates to make
  }

  // Add updated_at to the SET clauses
  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(id); // Add id for the WHERE clause

  const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${queryIndex} RETURNING id, username, email, credits, is_admin, created_at, updated_at`;

  try {
    const res = await pool.query<User>(query, values);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error updating user ID ${id}:`, error);
    throw error;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  const pool = getPgPool();
  try {
    const res = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return res.rowCount !== null && res.rowCount > 0;
  } catch (error) {
    logger.error(`Error deleting user ID ${id}:`, error);
    throw error;
  }
}

// Example of how you might want to adjust credits, could be in a service layer too
export async function adjustUserCredits(id: string, amount: number): Promise<User | null> {
    const pool = getPgPool();
    try {
        const res = await pool.query<User>(
            'UPDATE users SET credits = credits + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, credits, is_admin, created_at, updated_at',
            [amount, id]
        );
        return res.rows[0] || null;
    } catch (error) {
        logger.error(`Error adjusting credits for user ID ${id}:`, error);
        // Consider specific error handling for constraints like credits >= 0 if added in DB
        throw error;
    }
}
