// src/store/sessionStore.ts
import { create } from 'zustand';
import { Session, Message, SessionState, CreateSessionPayload, ApiResponse } from '../types';
import { sessionService }_from '../services/sessionService';
import { socketService } from '../services/socketService';
import { useAuthStore } from './authStore'; // For user ID if needed for optimistic updates

// Helper to sort messages by date
const sortMessages = (a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

export const useSessionStore = create<SessionState>()((set, get) => ({
  sessions: [],
  currentSessionId: null,
  // currentSession: null, // Removed, details are merged into the session in the sessions array
  isLoadingList: false,
  isLoadingDetails: false,
  error: null,

  fetchSessions: async () => {
    set({ isLoadingList: true, error: null });
    try {
      const response = await sessionService.getSessions();
      if (response.success && response.data) {
        // Initialize sessions with empty messages array and default states
        const initializedSessions = response.data.map(s => ({
            ...s,
            messages: [],
            isLoadingMessages: false,
            hasMoreMessages: true // Assume more messages can be loaded initially
        }));
        set({ sessions: initializedSessions, isLoadingList: false });
      } else {
        throw new Error(response.error || 'Failed to fetch sessions');
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingList: false });
    }
  },

  createSession: async (payload: CreateSessionPayload): Promise<Session | null> => {
    set({ isLoadingDetails: true, error: null }); // Use isLoadingDetails for single session actions
    try {
      const response = await sessionService.createSession(payload);
      if (response.success && response.data) {
        const newSession = { ...response.data, messages: [], isLoadingMessages: false, hasMoreMessages: true };
        set((state) => ({
          sessions: [newSession, ...state.sessions], // Add to start of list
          currentSessionId: newSession.id,
          // currentSession: newSession, // Set as current
          isLoadingDetails: false,
        }));
        socketService.joinSession(newSession.id);
        return newSession;
      } else {
        throw new Error(response.error || 'Failed to create session');
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingDetails: false });
      return null;
    }
  },

  getSessionDetails: async (sessionId: string, loadMessages: boolean = true): Promise<Session | null> => {
    set({ isLoadingDetails: true, error: null, currentSessionId: sessionId });
    try {
      // First, check if session metadata is already in the list
      let session = get().sessions.find(s => s.id === sessionId);
      if (!session) { // If not, fetch basic session details
          const response = await sessionService.getSessionById(sessionId);
          if (response.success && response.data) {
              session = { ...response.data, messages: [], isLoadingMessages: false, hasMoreMessages: true };
              // Add or update in the main list
              set(state => ({ sessions: state.sessions.map(s => s.id === sessionId ? session! : s)
                                         .concat(state.sessions.find(s=>s.id === sessionId) ? [] : [session!])}))
          } else {
              throw new Error(response.error || `Session ${sessionId} not found.`);
          }
      } else {
         // Session metadata exists, ensure it's the current one and update its loading state
         set(state => ({
            sessions: state.sessions.map(s =>
                s.id === sessionId ? { ...s, isLoadingMessages: loadMessages } : s
            )
         }));
      }

      if (loadMessages) {
        // TODO: Implement pagination for messages if needed, or load latest N
        const messagesResponse = await sessionService.getMessagesForSession(sessionId, 50, 0); // Load last 50
        if (messagesResponse.success && messagesResponse.data) {
            const sortedMessages = messagesResponse.data.sort(sortMessages);
            set(state => ({
                sessions: state.sessions.map(s =>
                    s.id === sessionId ? { ...s, messages: sortedMessages, isLoadingMessages: false, hasMoreMessages: messagesResponse.data!.length === 50 } : s
                )
            }));
        } else {
            throw new Error(messagesResponse.error || 'Failed to load messages.');
        }
      }
      socketService.joinSession(sessionId); // Join room if not already
      set({ isLoadingDetails: false });
      return get().sessions.find(s => s.id === sessionId) || null;

    } catch (error: any) {
      set({ error: error.message, isLoadingDetails: false });
      set(state => ({
        sessions: state.sessions.map(s =>
            s.id === sessionId ? { ...s, isLoadingMessages: false } : s
        )
      }));
      return null;
    }
  },

  clearCurrentSession: () => {
    const currentId = get().currentSessionId;
    if (currentId) {
        socketService.leaveSession(currentId);
    }
    set({ currentSessionId: null /* currentSession: null */ });
  },

  postMessage: async (sessionId: string, content: string) => {
    // Optimistic update for user message
    const currentUser = useAuthStore.getState().user;
    const tempUserMessageId = `temp_${Date.now()}`;
    const userMessage: Message = {
      id: tempUserMessageId, // Temporary ID
      tempId: tempUserMessageId,
      session_id: sessionId,
      user_id: currentUser?.id,
      content,
      role: 'user',
      created_at: new Date().toISOString(),
    };
    get().addMessage(sessionId, userMessage);

    // Placeholder for AI's response (streaming or complete)
    const tempAiMessageId = `temp_ai_${Date.now()}`;
    const aiPlaceholderMessage: Message = {
        id: tempAiMessageId,
        tempId: tempAiMessageId,
        session_id: sessionId,
        role: 'ai',
        content: '...', // Placeholder for streaming
        isStreaming: true,
        created_at: new Date().toISOString(),
    };
    get().addMessage(sessionId, aiPlaceholderMessage);

    try {
      const response = await sessionService.postMessage(sessionId, content);
      if (response.success && response.data) {
        const { userMessage: confirmedUserMsg, aiMessage: actualAiMsg } = response.data;
        // Update user message with confirmed ID from backend (if different)
        get().updateMessage(sessionId, tempUserMessageId, { ...confirmedUserMsg, tempId: undefined });
        // Update AI message with actual content and ID
        get().updateMessage(sessionId, tempAiMessageId, { ...actualAiMsg, isStreaming: false, tempId: undefined });
      } else {
        throw new Error(response.error || 'Failed to post message');
      }
    } catch (error: any) {
      get().updateMessage(sessionId, tempUserMessageId, { error: 'Failed to send message.' });
      get().updateMessage(sessionId, tempAiMessageId, { content: 'Error receiving response.', error: error.message, isStreaming: false });
    }
  },

  addMessage: (sessionId: string, message: Message) => {
    set((state) => ({
      sessions: state.sessions.map(s => {
        if (s.id === sessionId) {
          // Avoid duplicates if message already exists (e.g. from optimistic update then WS)
          if (s.messages.find(m => m.id === message.id || (message.tempId && m.tempId === message.tempId))) {
            // If it exists, update it instead of adding a duplicate
            return {
              ...s,
              messages: s.messages.map(m => (m.id === message.id || (message.tempId && m.tempId === message.tempId)) ? { ...m, ...message, tempId: undefined } : m).sort(sortMessages)
            };
          }
          return { ...s, messages: [...s.messages, message].sort(sortMessages) };
        }
        return s;
      })
    }));
  },

  updateMessage: (sessionId: string, messageIdOrTempId: string, updates: Partial<Message>) => {
    set((state) => ({
      sessions: state.sessions.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: s.messages.map(m =>
              (m.id === messageIdOrTempId || m.tempId === messageIdOrTempId)
              ? { ...m, ...updates }
              : m
            ).sort(sortMessages)
          };
        }
        return s;
      })
    }));
  },

  // --- Skill pack management within session ---
  addSkillPackToSession: async (sessionId: string, skillPackId: string) => {
    try {
        await sessionService.addSkillPackToSession(sessionId, skillPackId);
        set(state => ({
            sessions: state.sessions.map(s =>
                s.id === sessionId ? { ...s, activeSkillPackIds: Array.from(new Set([...(s.activeSkillPackIds || []), skillPackId])) } : s
            )
        }));
    } catch (error: any) {
        // Handle error (e.g., show notification)
        console.error(`Failed to add skill pack ${skillPackId} to session ${sessionId}:`, error);
        // Potentially set an error in the store
    }
  },

  removeSkillPackFromSession: async (sessionId: string, skillPackId: string) => {
    try {
        await sessionService.removeSkillPackFromSession(sessionId, skillPackId);
        set(state => ({
            sessions: state.sessions.map(s =>
                s.id === sessionId ? { ...s, activeSkillPackIds: (s.activeSkillPackIds || []).filter(id => id !== skillPackId) } : s
            )
        }));
    } catch (error: any)
{
        console.error(`Failed to remove skill pack ${skillPackId} from session ${sessionId}:`, error);
    }
  },

}));

// Selector to get the current session object with messages
export const selectCurrentSessionWithDetails = (state: SessionState): Session | null => {
    if (!state.currentSessionId) return null;
    return state.sessions.find(s => s.id === state.currentSessionId) || null;
};
