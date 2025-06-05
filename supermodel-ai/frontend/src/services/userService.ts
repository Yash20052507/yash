// src/services/userService.ts
import apiClient from './apiClient';
import { User, ApiResponse, ApiKey, ApiKeyDetails, Transaction } from '../types';

export interface UpdateUserProfilePayload {
    username?: string;
    email?: string;
    password?: string; // For changing password
}

export interface GenerateApiKeyPayload {
    name: string;
    expires_at?: string; // ISO Date string
}

export const userService = {
  // Profile
  updateUserProfile: async (payload: UpdateUserProfilePayload): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.patch('/users/profile', payload);
    return data;
  },

  // API Keys
  listApiKeys: async (): Promise<ApiResponse<ApiKey[]>> => {
    const { data } = await apiClient.get('/users/api-keys');
    return data;
  },

  generateApiKey: async (payload: GenerateApiKeyPayload): Promise<ApiResponse<ApiKeyDetails>> => {
    // Backend sends { apiKey: "rawKey", details: { ...storedKeyData } }
    const { data } = await apiClient.post('/users/api-keys', payload);
    return data;
  },

  deleteApiKey: async (apiKeyId: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await apiClient.delete(`/users/api-keys/${apiKeyId}`);
    return data;
  },

  // Transactions
  listUserTransactions: async (limit: number = 20, offset: number = 0): Promise<ApiResponse<Transaction[]>> => {
    const { data } = await apiClient.get('/users/transactions', { params: { limit, offset } });
    return data;
  }
};
