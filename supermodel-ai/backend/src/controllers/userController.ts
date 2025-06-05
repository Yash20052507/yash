// src/controllers/userController.ts
import { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import { updateUser, findUserById, deleteUser, UserUpdate } from '../models/User';
import { createApiKey, findApiKeysByUserId, deleteApiKey as removeApiKeyModel, NewApiKey, ApiKey } from '../models/ApiKey';
import { findTransactionsByUserId, Transaction } from '../models/Transaction';
import { hashPassword } from '../utils/auth'; // For API key hashing (if we were to generate keys here)
import { logger } from '../utils/logger';
import crypto from 'crypto'; // For generating actual API keys

// --- User Profile Management ---
export async function getUserProfile(req: Request, res: Response): Promise<void> {
    // req.user is populated by authMiddleware and should not have password_hash
    if (!req.user) {
        res.status(401).json({ success: false, error: 'User not found or not authenticated.' });
        return;
    }
    res.status(200).json({ success: true, data: req.user });
}

export async function updateUserProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'User not found or not authenticated.' });
        return;
    }
    const updates = matchedData(req, { locations: ['body']}) as UserUpdate;

    // Prevent users from making themselves admin or changing credits directly via this route
    if (updates.is_admin !== undefined) delete updates.is_admin;
    if (updates.credits !== undefined) delete updates.credits;

    if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, error: 'No update data provided.' });
        return;
    }

    try {
        const updatedUser = await updateUser(req.user.id, updates);
        if (!updatedUser) {
            res.status(404).json({ success: false, error: 'User not found after update.' });
            return;
        }
        const { password_hash, ...userWithoutPassword } = updatedUser;
        logger.info(`User profile updated for ${req.user.username} (ID: ${req.user.id})`);
        res.status(200).json({ success: true, data: userWithoutPassword });
    } catch (error: any) {
        logger.error(`Error updating user profile for ID ${req.user.id}:`, { message: error.message });
        if (error.message.includes('duplicate key value violates unique constraint')) { // Example for unique constraint
            res.status(409).json({ success: false, error: 'Update failed due to conflicting data (e.g., email or username already exists).' });
        } else {
            res.status(500).json({ success: false, error: 'Server error during profile update.' });
        }
    }
}

// --- API Key Management ---
export async function listApiKeys(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated.'});
        return;
    }
    try {
        const apiKeys = await findApiKeysByUserId(req.user.id);
        res.status(200).json({ success: true, data: apiKeys });
    } catch (error: any) {
        logger.error(`Error listing API keys for user ID ${req.user.id}:`, { message: error.message });
        res.status(500).json({ success: false, error: 'Server error listing API keys.' });
    }
}

export async function generateApiKey(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated.'});
        return;
    }
    const { name, expires_at } = matchedData(req, { locations: ['body']});

    try {
        // Generate a new secure API key
        const apiKeyString = `sk-${crypto.randomBytes(24).toString('hex')}`; // Example format: sk_...
        const keyHash = await hashPassword(apiKeyString); // Hash the key for storage

        const newApiKeyData: NewApiKey = {
            user_id: req.user.id,
            key_hash: keyHash,
            name: name,
            expires_at: expires_at ? new Date(expires_at) : undefined,
        };
        const createdApiKey = await createApiKey(newApiKeyData);

        logger.info(`API Key generated for user: ${req.user.username} (Key ID: ${createdApiKey.id})`);
        // Return the raw apiKeyString to the user ONCE. It won't be stored by us.
        res.status(201).json({
            success: true,
            data: {
                apiKey: apiKeyString, // Show the key to the user this one time
                details: { // Return details of the stored record (without hash)
                    id: createdApiKey.id,
                    name: createdApiKey.name,
                    user_id: createdApiKey.user_id,
                    expires_at: createdApiKey.expires_at,
                    created_at: createdApiKey.created_at,
                }
            }
        });
    } catch (error: any) {
        logger.error(`Error generating API key for user ID ${req.user.id}:`, { message: error.message });
        res.status(500).json({ success: false, error: 'Server error generating API key.' });
    }
}

export async function deleteApiKey(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated.'});
        return;
    }
    const { apiKeyId } = matchedData(req, { locations: ['params']});

    try {
        const apiKey = await findApiKeyById(apiKeyId); // findApiKeyById doesn't return hash
        if (!apiKey || apiKey.user_id !== req.user.id) {
            res.status(404).json({ success: false, error: 'API key not found or access denied.' });
            return;
        }
        await removeApiKeyModel(apiKeyId);
        logger.info(`API Key ${apiKeyId} deleted by user ${req.user.username}`);
        res.status(200).json({ success: true, message: 'API key deleted successfully.' });
    } catch (error: any) {
        logger.error(`Error deleting API key ${apiKeyId} for user ID ${req.user.id}:`, { message: error.message });
        res.status(500).json({ success: false, error: 'Server error deleting API key.' });
    }
}

// --- User Transactions ---
export async function listUserTransactions(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated.'});
        return;
    }
    const { limit = '20', offset = '0' } = req.query; // Get pagination from query

    try {
        const transactions = await findTransactionsByUserId(req.user.id, parseInt(limit as string), parseInt(offset as string));
        // Could also return total count for pagination UI
        res.status(200).json({ success: true, data: transactions });
    } catch (error: any) {
        logger.error(`Error listing transactions for user ID ${req.user.id}:`, { message: error.message });
        res.status(500).json({ success: false, error: 'Server error listing transactions.' });
    }
}
