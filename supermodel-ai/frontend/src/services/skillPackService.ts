// src/services/skillPackService.ts
import apiClient from './apiClient';
import {
    SkillPack, SkillPackContentData, SkillPackReview,
    ApiResponse, SkillPackFilters, CreateReviewPayload,
    CreateSkillPackPayload, UpdateSkillPackPayload, Task
} from '../types';

export const skillPackService = {
  // --- Marketplace ---
  getMarketplaceSkillPacks: async (
    filters?: SkillPackFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<{ packs: SkillPack[], totalItems: number }>> => { // Assuming backend sends totalItems
    const { data } = await apiClient.get('/marketplace/skill-packs', { params: { ...filters, page, limit } });
    return data;
  },

  getPublicSkillPackDetails: async (skillPackId: string): Promise<ApiResponse<SkillPack>> => {
    // Backend controller for marketplace details includes content and reviews.
    const { data } = await apiClient.get(`/marketplace/skill-packs/${skillPackId}`);
    return data;
  },

  acquireSkillPack: async (skillPackId: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await apiClient.post(`/marketplace/skill-packs/${skillPackId}/acquire`);
    return data;
  },

  // --- Reviews (Marketplace context) ---
  getSkillPackReviews: async (skillPackId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<{reviews: SkillPackReview[], totalItems: number}>> => {
    const { data } = await apiClient.get(`/marketplace/skill-packs/${skillPackId}/reviews`, { params: { page, limit }});
    return data;
  },

  createReview: async (skillPackId: string, payload: CreateReviewPayload): Promise<ApiResponse<SkillPackReview>> => {
    const { data } = await apiClient.post(`/marketplace/skill-packs/${skillPackId}/reviews`, payload);
    return data;
  },

  updateReview: async (skillPackId: string, reviewId: string, payload: Partial<CreateReviewPayload>): Promise<ApiResponse<SkillPackReview>> => {
    const { data } = await apiClient.patch(`/marketplace/skill-packs/${skillPackId}/reviews/${reviewId}`, payload);
    return data;
  },

  deleteReview: async (skillPackId: string, reviewId: string): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete(`/marketplace/skill-packs/${skillPackId}/reviews/${reviewId}`);
    return data;
  },

  // --- User's Own Skill Packs (Management) ---
  getMySkillPacks: async (): Promise<ApiResponse<SkillPack[]>> => {
    const { data } = await apiClient.get('/skill-packs'); // Endpoint for user's own skill packs
    return data;
  },

  getMySkillPackDetails: async (skillPackId: string): Promise<ApiResponse<SkillPack>> => {
    // This also includes content from the skillPackController
    const { data } = await apiClient.get(`/skill-packs/${skillPackId}`);
    return data;
  },

  createSkillPack: async (payload: CreateSkillPackPayload): Promise<ApiResponse<SkillPack>> => {
    const { data } = await apiClient.post('/skill-packs', payload);
    return data;
  },

  updateSkillPack: async (skillPackId: string, payload: UpdateSkillPackPayload): Promise<ApiResponse<SkillPack>> => {
    const { data } = await apiClient.patch(`/skill-packs/${skillPackId}`, payload);
    return data;
  },

  deleteSkillPack: async (skillPackId: string): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete(`/skill-packs/${skillPackId}`);
    return data;
  },

  triggerEmbeddingsGeneration: async (skillPackId: string): Promise<ApiResponse<Task>> => {
    const { data } = await apiClient.post(`/skill-packs/${skillPackId}/generate-embeddings`);
    return data;
  }
};
