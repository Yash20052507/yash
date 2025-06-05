// src/models/Transaction.ts
import { getPgPool } from '../utils/db';
import { Transaction, NewTransaction } from '../types';
import { logger } from '../utils/logger';

export async function createTransaction(newTransaction: NewTransaction): Promise<Transaction> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Transaction>(
      'INSERT INTO transactions (user_id, type, amount_credits, reference_id, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        newTransaction.user_id,
        newTransaction.type,
        newTransaction.amount_credits,
        newTransaction.reference_id,
        newTransaction.description,
      ]
    );
    return res.rows[0];
  } catch (error) {
    logger.error('Error creating transaction:', error);
    // Consider specific error handling, e.g., if user_id doesn't exist or credits constraints
    throw error;
  }
}

export async function findTransactionById(id: string): Promise<Transaction | null> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Transaction>('SELECT * FROM transactions WHERE id = $1', [id]);
    return res.rows[0] || null;
  } catch (error) {
    logger.error(`Error finding transaction by ID ${id}:`, error);
    throw error;
  }
}

export async function findTransactionsByUserId(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Transaction[]> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Transaction>(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return res.rows;
  } catch (error) {
    logger.error(`Error finding transactions for user ID ${userId}:`, error);
    throw error;
  }
}

export async function findTransactionsByReferenceId(referenceId: string): Promise<Transaction[]> {
  const pool = getPgPool();
  try {
    const res = await pool.query<Transaction>(
      'SELECT * FROM transactions WHERE reference_id = $1 ORDER BY created_at DESC',
      [referenceId]
    );
    return res.rows;
  } catch (error) {
    logger.error(`Error finding transactions for reference ID ${referenceId}:`, error);
    throw error;
  }
}

export async function calculateUserCreditBalance(userId: string): Promise<number> {
    const pool = getPgPool();
    try {
        // This calculates balance from transactions.
        // The users.credits column should ideally be kept in sync via triggers or application logic.
        const res = await pool.query<{ sum: string | null }>(
            'SELECT SUM(amount_credits) as sum FROM transactions WHERE user_id = $1',
            [userId]
        );
        return res.rows[0]?.sum ? parseInt(res.rows[0].sum, 10) : 0;
    } catch (error) {
        logger.error(`Error calculating credit balance for user ID ${userId}:`, error);
        throw error;
    }
}

// Note: Transactions are typically immutable once created.
// Updates or deletions would usually be handled by creating counter-transactions (e.g., a 'refund' transaction).
// Thus, update/delete functions are generally not provided for a transactions table.
// If a transaction needs to be voided or corrected, a new transaction should be issued.
// For example, if a skill_pack_purchase was made in error, a 'refund' transaction would be created.
