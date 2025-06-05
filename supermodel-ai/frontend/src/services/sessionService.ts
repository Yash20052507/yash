// src/services/sessionService.ts
import apiClient from './apiClient';
import { Session, Message, ApiResponse, CreateSessionPayload } from '../types';

export const sessionService = {
  getSessions: async (): Promise<ApiResponse<Session[]>> => {
    const { data } = await apiClient.get('/sessions');
    return data;
  },

  createSession: async (payload: CreateSessionPayload): Promise<ApiResponse<Session>> => {
    const { data } = await apiClient.post('/sessions', payload);
    return data;
  },

  getSessionById: async (sessionId: string): Promise<ApiResponse<Session>> => { // Messages are part of session in controller
    const { data } = await apiClient.get(`/sessions/${sessionId}`);
    return data;
  },

  getMessagesForSession: async (sessionId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse<Message[]>> => {
    const { data } = await apiClient.get(`/sessions/${sessionId}/messages`, { params: { limit, offset }});
    return data;
  },

  postMessage: async (sessionId: string, content: string): Promise<ApiResponse<{userMessage: Message, aiMessage: Message}>> => {
    // The backend controller for posting a message immediately returns both user and AI message
    const { data } = await apiClient.post(`/sessions/${sessionId}/messages`, { content });
    return data;
  },

  updateSession: async (sessionId: string, payload: Partial<CreateSessionPayload>): Promise<ApiResponse<Session>> => {
    const { data } = await apiClient.patch(`/sessions/${sessionId}`, payload);
    return data;
  },

  deleteSession: async (sessionId: string): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete(`/sessions/${sessionId}`);
    return data;
  },

  // --- SkillPacks within a Session ---
  getSessionSkillPacks: async (sessionId: string): Promise<ApiResponse<Session['activeSkillPackIds']>> => {
    // Backend returns full SkillPack objects, but type expects IDs. Adapt as needed or change type.
    // For now, assuming controller returns SkillPack[] and we map to IDs if necessary, or use SkillPack[] type.
    const { data } = await apiClient.get(`/sessions/${sessionId}/skill-packs`);
    return data; // This might be ApiResponse<SkillPack[]> from backend. Adjust types if so.
  },

  addSkillPackToSession: async (sessionId: string, skillPackId: string): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.post(`/sessions/${sessionId}/skill-packs/${skillPackId}`);
    return data;
  },

  removeSkillPackFromSession: async (sessionId: string, skillPackId: string): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete(`/sessions/${sessionId}/skill-packs/${skillPackId}`);
    return data;
  }
};
