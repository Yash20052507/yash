// src/services/taskService.ts
import apiClient from './apiClient';
import { Task, ApiResponse } from '../types';

export const taskService = {
  getMyTasks: async (limit: number = 20, offset: number = 0): Promise<ApiResponse<Task[]>> => {
    const { data } = await apiClient.get('/tasks', { params: { limit, offset } });
    return data;
  },

  getTaskDetails: async (taskId: string): Promise<ApiResponse<Task>> => {
    const { data } = await apiClient.get(`/tasks/${taskId}`);
    return data;
  }

  // Task creation is typically a result of other actions (e.g., triggering embeddings)
  // and not directly exposed as a generic 'create task' API for frontend clients.
  // If there's a need for admin to create tasks or specific user-creatable tasks,
  // those specific endpoints would be added here.
};
