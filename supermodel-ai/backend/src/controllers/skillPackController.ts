// src/controllers/skillPackController.ts
import { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import {
    createSkillPack,
    findSkillPackById,
    findSkillPacksByAuthorId,
    updateSkillPack,
    deleteSkillPack,
    NewSkillPack,
    SkillPackUpdate
} from '../models/SkillPack';
import {
    createSkillPackContent,
    findSkillPackContentByPgId,
    updateSkillPackContent,
    deleteSkillPackContent, // If deleting content when PG skill pack is deleted
    NewSkillPackContent,
    SkillPackContentUpdate,
    deleteAllSkillPackContentsByPgId
} from '../models/SkillPackContent'; // MongoDB model
import { User, SkillPack } from '../types';
import { logger } from '../utils/logger';
import { addEmbeddingGenerationTaskToQueue } from '../jobs/queue'; // For triggering embedding jobs
import { createTask, NewTask } from '../models/Task';


export async function listMySkillPacks(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    try {
        const skillPacks = await findSkillPacksByAuthorId(user.id);
        res.status(200).json({ success: true, data: skillPacks });
    } catch (error: any) {
        logger.error(`Error listing skill packs for author ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to list skill packs.' });
    }
}

export async function getMySkillPackDetails(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { skillPackId } = matchedData(req, { locations: ['params'] });
    try {
        const skillPack = await findSkillPackById(skillPackId);
        if (!skillPack || skillPack.author_id !== user.id) {
            res.status(404).json({ success: false, error: 'Skill pack not found or access denied.' });
            return;
        }
        // Fetch MongoDB content for this skill pack (latest version)
        const content = await findSkillPackContentByPgId(skillPackId, skillPack.version); // or latest if version not fixed
        res.status(200).json({ success: true, data: { ...skillPack, content: content?.content } });
    } catch (error: any) {
        logger.error(`Error fetching skill pack ${skillPackId} for author ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to fetch skill pack details.' });
    }
}

export async function createNewSkillPack(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { name, description, category, version, price_credits, is_public, content } = req.validatedData as any; // Using validatedData

    try {
        const newSkillPackData: NewSkillPack = {
            author_id: user.id,
            name,
            description,
            category,
            version: version || '1.0.0', // Default version
            price_credits: price_credits || 0,
            is_public: is_public === undefined ? true : is_public, // Default to public
        };
        // content_hash can be added later if derived from actual content
        const skillPack = await createSkillPack(newSkillPackData);

        if (content) {
            const newContentData: NewSkillPackContent = {
                skill_pack_pg_id: skillPack.id,
                version: skillPack.version,
                content, // Expects SkillPackContentData structure
            };
            await createSkillPackContent(newContentData);
        }

        logger.info(`Skill pack "${skillPack.name}" (ID: ${skillPack.id}) created by user ${user.username}`);
        res.status(201).json({ success: true, data: skillPack });
    } catch (error: any) {
        logger.error(`Error creating skill pack for user ${user.id}:`, error);
        if (error.message.includes('duplicate key value violates unique constraint')) {
             res.status(409).json({ success: false, error: 'A skill pack with the same name and version may already exist under your account.' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to create skill pack.' });
        }
    }
}

export async function updateMySkillPack(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { skillPackId } = matchedData(req, { locations: ['params'] });
    const { name, description, category, version, price_credits, is_public, content } = req.validatedData as any;

    try {
        const skillPack = await findSkillPackById(skillPackId);
        if (!skillPack || skillPack.author_id !== user.id) {
            res.status(404).json({ success: false, error: 'Skill pack not found or access denied.' });
            return;
        }

        const updates: SkillPackUpdate = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (category !== undefined) updates.category = category;
        if (version !== undefined) updates.version = version; // Changing version might need careful handling for content
        if (price_credits !== undefined) updates.price_credits = price_credits;
        if (is_public !== undefined) updates.is_public = is_public;
        // content_hash could be updated if content changes

        let updatedSkillPack = skillPack;
        if (Object.keys(updates).length > 0) {
            const result = await updateSkillPack(skillPackId, updates);
            if (!result) throw new Error("Skill pack update failed in DB.");
            updatedSkillPack = result;
        }

        if (content) {
            const currentContent = await findSkillPackContentByPgId(skillPackId, updatedSkillPack.version);
            const contentUpdateData: NewSkillPackContent | SkillPackContentUpdate = {
                skill_pack_pg_id: skillPackId,
                version: updatedSkillPack.version, // Use potentially updated version
                content,
            };
            if (currentContent && currentContent._id) {
                await updateSkillPackContent(currentContent._id.toString(), contentUpdateData as SkillPackContentUpdate);
            } else {
                // If version changed and no content for new version, or no content existed
                await createSkillPackContent(contentUpdateData as NewSkillPackContent);
            }
        }

        logger.info(`Skill pack ${skillPackId} updated by user ${user.username}`);
        res.status(200).json({ success: true, data: updatedSkillPack });
    } catch (error: any) {
        logger.error(`Error updating skill pack ${skillPackId} for user ${user.id}:`, error);
        if (error.message.includes('duplicate key value violates unique constraint')) {
             res.status(409).json({ success: false, error: 'Update failed. A skill pack with the same name and version may already exist.' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to update skill pack.' });
        }
    }
}

export async function deleteMySkillPack(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { skillPackId } = matchedData(req, { locations: ['params'] });
    try {
        const skillPack = await findSkillPackById(skillPackId);
        if (!skillPack || skillPack.author_id !== user.id) {
            res.status(404).json({ success: false, error: 'Skill pack not found or access denied.' });
            return;
        }
        // Delete associated MongoDB content first
        const deletedCount = await deleteAllSkillPackContentsByPgId(skillPackId);
        logger.info(`Deleted ${deletedCount} MongoDB content document(s) for skill pack ${skillPackId}`);

        // Then delete the PostgreSQL record
        await deleteSkillPack(skillPackId);
        // Consider what happens to users who acquired it, reviews, etc. (soft delete might be better)

        logger.info(`Skill pack ${skillPackId} and its content deleted by user ${user.username}`);
        res.status(200).json({ success: true, message: 'Skill pack and its content deleted successfully.' });
    } catch (error: any) {
        logger.error(`Error deleting skill pack ${skillPackId} for user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to delete skill pack.' });
    }
}

export async function triggerSkillPackEmbedding(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { skillPackId } = matchedData(req, { locations: ['params'] });

    try {
        const skillPack = await findSkillPackById(skillPackId);
        if (!skillPack || skillPack.author_id !== user.id) {
            res.status(404).json({ success: false, error: 'Skill pack not found or access denied to trigger embeddings.' });
            return;
        }

        const content = await findSkillPackContentByPgId(skillPackId, skillPack.version);
        if (!content || !content.content ||
            (Object.keys(content.content).length === 0 && (!content.content.instructions && !content.content.knowledge_base_summary))) {
            res.status(400).json({ success: false, error: `Skill pack ${skillPack.name} (v${skillPack.version}) has no content to process for embeddings.` });
            return;
        }
        if (content.embeddings_status === 'generated' || content.embeddings_status === 'processing' ) {
             res.status(409).json({ success: false, error: `Embeddings for skill pack ${skillPack.name} (v${skillPack.version}) are already ${content.embeddings_status} or being processed.` });
            return;
        }


        // Create a task for this job
        const newTaskData: NewTask = {
            user_id: user.id,
            type: 'skillpack_embedding_generation',
            metadata: { skillPackId: skillPack.id, skillPackVersion: skillPack.version, skillPackName: skillPack.name },
        };
        const task = await createTask(newTaskData);

        await addEmbeddingGenerationTaskToQueue(task.id, skillPack.id, skillPack.version);

        logger.info(`Embedding generation task ${task.id} queued for skill pack ${skillPack.id} v${skillPack.version} by user ${user.username}`);
        res.status(202).json({
            success: true,
            message: 'Embedding generation task queued.',
            taskId: task.id,
            skillPackId: skillPack.id,
            version: skillPack.version
        });

    } catch (error: any) {
        logger.error(`Error triggering embedding generation for skill pack ${skillPackId} by user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to queue embedding generation task.' });
    }
}
