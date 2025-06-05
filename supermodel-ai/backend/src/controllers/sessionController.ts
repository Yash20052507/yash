// src/controllers/sessionController.ts
import { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import {
    createSession,
    findSessionById,
    findSessionsByUserId,
    updateSession,
    deleteSession,
    addSkillPackToSession,
    removeSkillPackFromSession,
    getSkillPacksForSession as getSkillPackIdsForSession, // Model returns IDs
} from '../models/Session';
import { createMessage, findMessagesBySessionId, NewMessage } from '../models/Message';
import { AIService } from '../ai/AIService';
import { SkillPackManager } from '../ai/SkillPackManager';
import { SkillPack, User } from '../types'; // Import full SkillPack for details
import { findSkillPackById } from '../models/SkillPack'; // To get full skill pack details
import { logger } from '../utils/logger';

let aiServiceInstance: AIService;
let skillPackManagerInstance: SkillPackManager;

function getAIService(): AIService {
    if (!aiServiceInstance) aiServiceInstance = new AIService();
    return aiServiceInstance;
}
function getSkillPackManager(): SkillPackManager {
    if (!skillPackManagerInstance) skillPackManagerInstance = new SkillPackManager(getAIService());
    return skillPackManagerInstance;
}


export async function getAllSessions(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    try {
        const sessions = await findSessionsByUserId(user.id);
        res.status(200).json({ success: true, data: sessions });
    } catch (error: any) {
        logger.error(`Error fetching sessions for user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to fetch sessions.' });
    }
}

export async function getSessionDetails(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { sessionId } = matchedData(req, { locations: ['params'] });
    try {
        const session = await findSessionById(sessionId);
        if (!session || session.user_id !== user.id) {
            res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            return;
        }
        // Optionally, enrich with messages or skill pack details here if needed often
        res.status(200).json({ success: true, data: session });
    } catch (error: any) {
        logger.error(`Error fetching session ${sessionId} for user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to fetch session details.' });
    }
}

export async function createNewSession(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { name, context_summary } = matchedData(req, { locations: ['body'] });
    try {
        const newSession = await createSession({ user_id: user.id, name, context_summary });
        res.status(201).json({ success: true, data: newSession });
    } catch (error: any) {
        logger.error(`Error creating session for user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to create session.' });
    }
}

export async function updateExistingSession(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { sessionId } = matchedData(req, { locations: ['params'] });
    const updates = matchedData(req, { locations: ['body'] });

    try {
        const session = await findSessionById(sessionId);
        if (!session || session.user_id !== user.id) {
            res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            return;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(200).json({ success: true, data: session }); // No updates, return current
        }
        const updatedSession = await updateSession(sessionId, updates);
        res.status(200).json({ success: true, data: updatedSession });
    } catch (error: any) {
        logger.error(`Error updating session ${sessionId} for user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to update session.' });
    }
}

export async function deleteExistingSession(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { sessionId } = matchedData(req, { locations: ['params'] });
    try {
        const session = await findSessionById(sessionId);
        if (!session || session.user_id !== user.id) {
            res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            return;
        }
        await deleteSession(sessionId);
        res.status(200).json({ success: true, message: 'Session deleted successfully.' });
    } catch (error: any) {
        logger.error(`Error deleting session ${sessionId} for user ${user.id}:`, error);
        res.status(500).json({ success: false, error: 'Failed to delete session.' });
    }
}

// --- Messages within a Session ---
export async function getSessionMessages(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { sessionId } = matchedData(req, { locations: ['params'] });
    const { limit = '50', offset = '0' } = req.query;

    try {
        const session = await findSessionById(sessionId);
        if (!session || session.user_id !== user.id) {
            res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            return;
        }
        const messages = await findMessagesBySessionId(sessionId, parseInt(limit as string), parseInt(offset as string));
        res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
        logger.error(`Error fetching messages for session ${sessionId}:`, error);
        res.status(500).json({ success: false, error: 'Failed to fetch messages.' });
    }
}

export async function postMessageToSession(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { sessionId } = matchedData(req, { locations: ['params'] });
    const { content, role } = matchedData(req, { locations: ['body'] });

    if (role && role !== 'user') {
        res.status(400).json({ success: false, error: "User can only post messages with 'user' role." });
        return;
    }

    try {
        const session = await findSessionById(sessionId);
        if (!session || session.user_id !== user.id) {
            res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            return;
        }

        // 1. Save user message
        const userMessageData: NewMessage = { session_id: sessionId, user_id: user.id, content, role: 'user' };
        const userMessage = await createMessage(userMessageData);

        // 2. Get active skill packs for the session
        const skillPackIds = await getSkillPackIdsForSession(sessionId);
        const skillPackContents = await getSkillPackManager().getSkillPackContentsByIds(skillPackIds);

        // 3. Get chat history (last N messages, simplified here)
        const history = (await findMessagesBySessionId(sessionId, 10, 0)) // Get last 10 messages
            .filter(m => m.id !== userMessage.id) // Exclude the message just posted
            .map(m => ({ role: m.role, content: m.content }));


        // 4. Generate AI response
        const ai = getAIService();
        const aiResponse = await ai.generateChatResponse(content, skillPackContents, history as any); // Type assertion for history

        // 5. Save AI message
        const aiMessageData: NewMessage = {
            session_id: sessionId,
            content: aiResponse.response,
            role: 'ai',
            token_count: aiResponse.tokensUsed,
            model_used: aiResponse.modelUsed,
        };
        const aiMessage = await createMessage(aiMessageData);

        res.status(201).json({ success: true, data: { userMessage, aiMessage } });

    } catch (error: any) {
        logger.error(`Error posting message or getting AI response for session ${sessionId}:`, error);
        if (error.message.includes('OpenAI API key is missing')) {
             res.status(500).json({ success: false, error: 'AI service is not configured.' });
        } else {
             res.status(500).json({ success: false, error: 'Failed to post message or get AI response.' });
        }
    }
}


// --- SkillPacks within a Session ---
export async function getSessionSkillPacks(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { sessionId } = matchedData(req, { locations: ['params'] });
    try {
        const session = await findSessionById(sessionId);
        if (!session || session.user_id !== user.id) {
            res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            return;
        }
        const skillPackIds = await getSkillPackIdsForSession(sessionId);
        // Fetch full skill pack details
        const skillPacks: SkillPack[] = [];
        for (const id of skillPackIds) {
            const sp = await findSkillPackById(id); // This is from SkillPack model
            if (sp) skillPacks.push(sp);
        }
        res.status(200).json({ success: true, data: skillPacks });
    } catch (error: any) {
        logger.error(`Error fetching skill packs for session ${sessionId}:`, error);
        res.status(500).json({ success: false, error: 'Failed to fetch session skill packs.' });
    }
}

export async function addSkillPackToCurrentSession(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { sessionId, skillPackId } = matchedData(req, { locations: ['params'] });
    try {
        const session = await findSessionById(sessionId);
        if (!session || session.user_id !== user.id) {
            res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            return;
        }
        // TODO: Validate that user has acquired this skillPackId (owns it or it's public and free)
        // This might involve checking UserSkillPacks table or SkillPack.is_public & price
        await addSkillPackToSession(sessionId, skillPackId);
        res.status(200).json({ success: true, message: 'Skill pack added to session.' });
    } catch (error: any) {
        logger.error(`Error adding skill pack ${skillPackId} to session ${sessionId}:`, error);
        res.status(500).json({ success: false, error: 'Failed to add skill pack to session.' });
    }
}

export async function removeSkillPackFromCurrentSession(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const { sessionId, skillPackId } = matchedData(req, { locations: ['params'] });
     try {
        const session = await findSessionById(sessionId);
        if (!session || session.user_id !== user.id) {
            res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            return;
        }
        await removeSkillPackFromSession(sessionId, skillPackId);
        res.status(200).json({ success: true, message: 'Skill pack removed from session.' });
    } catch (error: any) {
        logger.error(`Error removing skill pack ${skillPackId} from session ${sessionId}:`, error);
        res.status(500).json({ success: false, error: 'Failed to remove skill pack from session.' });
    }
}
