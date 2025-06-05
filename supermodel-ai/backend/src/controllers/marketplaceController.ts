// src/controllers/marketplaceController.ts
import { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import {
    findPublicSkillPacks, // From SkillPack model
    findSkillPackById,    // From SkillPack model
    addUserSkillPack,     // From SkillPack model (handles acquisition)
    createSkillPackReview,// From SkillPack model
    findReviewsBySkillPackId, // From SkillPack model
    updateSkillPackReview, // From SkillPack model
    deleteSkillPackReview  // From SkillPack model
} from '../models/SkillPack';
import { findSkillPackContentByPgId } from '../models/SkillPackContent'; // MongoDB model
import { findUserById, updateUser } from '../models/User'; // For deducting credits
import { createTransaction } from '../models/Transaction'; // For recording purchases
import { User, SkillPackReviewUpdate } from '../types';
import { logger } from '../utils/logger';

export async function listPublicSkillPacksController(req: Request, res: Response): Promise<void> {
    const { limit = '20', offset = '0', category, search } = req.query;
    // TODO: Add filtering by category and search term to findPublicSkillPacks model function
    try {
        const skillPacks = await findPublicSkillPacks(parseInt(limit as string), parseInt(offset as string));
        // Potentially add total count for pagination
        res.status(200).json({ success: true, data: skillPacks });
    } catch (error: any) {
        logger.error('Error listing public skill packs:', error);
        res.status(500).json({ success: false, error: 'Failed to list public skill packs.' });
    }
}

export async function getPublicSkillPackDetailsController(req: Request, res: Response): Promise<void> {
    const { skillPackId } = matchedData(req, { locations: ['params'] });
    try {
        const skillPack = await findSkillPackById(skillPackId);
        if (!skillPack || !skillPack.is_public) {
            res.status(404).json({ success: false, error: 'Public skill pack not found.' });
            return;
        }
        const content = await findSkillPackContentByPgId(skillPackId, skillPack.version); // Or latest version
        res.status(200).json({ success: true, data: { ...skillPack, content: content?.content } });
    } catch (error: any) {
        logger.error(`Error fetching public skill pack ${skillPackId}:`, error);
        res.status(500).json({ success: false, error: 'Failed to fetch public skill pack details.' });
    }
}

export async function acquireSkillPackController(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { skillPackId } = matchedData(req, { locations: ['params'] });

    try {
        const skillPack = await findSkillPackById(skillPackId);
        if (!skillPack || !skillPack.is_public) { // Must be public to be acquired from marketplace
            res.status(404).json({ success: false, error: 'Skill pack not found or not available for acquisition.' });
            return;
        }

        // Check if user already acquired it
        const existingAcquisition = await addUserSkillPack(user.id, skillPackId);
        if (existingAcquisition.acquired_at < new Date(Date.now() - 1000 * 60)) { // if acquired more than a minute ago
             return res.status(409).json({ success: false, error: 'Skill pack already acquired.' });
        }


        if (skillPack.price_credits > 0) {
            if (user.credits < skillPack.price_credits) {
                res.status(402).json({ success: false, error: 'Insufficient credits.' });
                return;
            }
            // Deduct credits
            const updatedUser = await updateUser(user.id, { credits: user.credits - skillPack.price_credits });
            if (!updatedUser) {
                throw new Error('Failed to update user credits.');
            }
            req.user = updatedUser; // Update req.user with new credit balance

            // Record transaction
            await createTransaction({
                user_id: user.id,
                type: 'skill_pack_purchase',
                amount_credits: -skillPack.price_credits, // Negative for deduction
                reference_id: skillPackId,
                description: `Purchased skill pack: ${skillPack.name}`,
            });
            logger.info(`User ${user.username} purchased skill pack ${skillPack.name} for ${skillPack.price_credits} credits.`);
        } else {
            // Free skill pack, no transaction or credit change, just log acquisition
            logger.info(`User ${user.username} acquired free skill pack ${skillPack.name}.`);
        }

        // addUserSkillPack handles adding to user_skill_packs and increments download_count
        // It was called earlier to check for existing acquisition, result can be used or re-fetched if needed.
        // For simplicity, we assume it has been handled.

        res.status(200).json({ success: true, message: `Skill pack "${skillPack.name}" acquired successfully.` });

    } catch (error: any) {
        logger.error(`Error acquiring skill pack ${skillPackId} for user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to acquire skill pack.' });
    }
}

// --- Reviews ---
export async function getSkillPackReviewsController(req: Request, res: Response): Promise<void> {
    const { skillPackId } = matchedData(req, { locations: ['params'] });
    const { limit = '10', offset = '0' } = req.query;
    try {
        // Check if skill pack exists and is public (optional, reviews could be for any existing pack)
        const skillPack = await findSkillPackById(skillPackId);
        if (!skillPack) {
            res.status(404).json({ success: false, error: 'Skill pack not found.' });
            return;
        }

        const reviews = await findReviewsBySkillPackId(skillPackId, parseInt(limit as string), parseInt(offset as string));
        // Could also return total review count and average rating
        res.status(200).json({ success: true, data: reviews });
    } catch (error: any) {
        logger.error(`Error fetching reviews for skill pack ${skillPackId}:`, error);
        res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
    }
}

export async function submitSkillPackReviewController(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { skillPackId } = matchedData(req, { locations: ['params'] });
    const { rating, comment } = matchedData(req, { locations: ['body'] });

    try {
        // Check if skill pack exists
        const skillPack = await findSkillPackById(skillPackId);
        if (!skillPack) {
            res.status(404).json({ success: false, error: 'Skill pack not found.' });
            return;
        }

        // TODO: Check if user has acquired this skill pack before allowing review (optional, business logic)
        // For example, check UserSkillPacks table

        const review = await createSkillPackReview({
            skill_pack_id: skillPackId,
            user_id: user.id,
            rating,
            comment,
        });
        logger.info(`Review submitted for skill pack ${skillPackId} by user ${user.username}`);
        res.status(201).json({ success: true, data: review });
    } catch (error: any) {
        logger.error(`Error submitting review for skill pack ${skillPackId} by user ${user.id}:`, error);
        if (error.message.includes('duplicate key value violates unique constraint')) { // From UNIQUE (skill_pack_id, user_id)
            res.status(409).json({ success: false, error: 'You have already reviewed this skill pack.' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to submit review.' });
        }
    }
}

export async function updateMySkillPackReviewController(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { skillPackId, reviewId } = matchedData(req, { locations: ['params'] });
    const { rating, comment } = matchedData(req, { locations: ['body'] });

    try {
        const reviews = await findReviewsBySkillPackId(skillPackId); // Get all reviews for the pack
        const review = reviews.find(r => r.id === reviewId);

        if (!review) {
            res.status(404).json({ success: false, error: 'Review not found.' });
            return;
        }
        if (review.user_id !== user.id) {
            res.status(403).json({ success: false, error: 'Access denied to update this review.' });
            return;
        }

        const updates: SkillPackReviewUpdate = {};
        if (rating !== undefined) updates.rating = rating;
        if (comment !== undefined) updates.comment = comment;

        if (Object.keys(updates).length === 0) {
            res.status(200).json({ success: true, data: review }); // No changes
            return;
        }

        const updatedReview = await updateSkillPackReview(reviewId, updates);
        logger.info(`Review ${reviewId} updated by user ${user.username}`);
        res.status(200).json({ success: true, data: updatedReview });
    } catch (error: any) {
        logger.error(`Error updating review ${reviewId} by user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to update review.' });
    }
}

export async function deleteMySkillPackReviewController(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { skillPackId, reviewId } = matchedData(req, { locations: ['params'] });
     try {
        const reviews = await findReviewsBySkillPackId(skillPackId);
        const review = reviews.find(r => r.id === reviewId);

        if (!review) {
            res.status(404).json({ success: false, error: 'Review not found.' });
            return;
        }
        // Allow admin to delete any review, or user to delete their own.
        if (review.user_id !== user.id && !user.is_admin) {
            res.status(403).json({ success: false, error: 'Access denied to delete this review.' });
            return;
        }

        await deleteSkillPackReview(reviewId);
        logger.info(`Review ${reviewId} deleted by user ${user.username} (or admin)`);
        res.status(200).json({ success: true, message: 'Review deleted successfully.' });
    } catch (error: any) {
        logger.error(`Error deleting review ${reviewId} by user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to delete review.' });
    }
}
