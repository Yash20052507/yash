// src/services/authService.ts
import apiClient from './apiClient';
import { User, ApiResponse, LoginPayload, RegisterPayload } from '../types';

export const authService = {
  login: async (credentials: LoginPayload): Promise<ApiResponse<{ token: string; user: User }>> => {
    // The backend might expect 'email' or 'username'. Adjust payload as needed or handle in backend.
    // For now, assuming backend handles 'email' for login.
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  register: async (userData: RegisterPayload): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.post('/auth/register', userData);
    return data;
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  // Example: Update User Profile (could be in a userService.ts)
  updateProfile: async (userId: string, profileData: Partial<User>): Promise<ApiResponse<User>> => {
    const { data } = await apiClient.patch(`/users/profile`, profileData); // Assuming endpoint structure
    return data;
  }
};
