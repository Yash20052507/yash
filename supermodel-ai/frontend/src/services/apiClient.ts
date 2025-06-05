// src/services/apiClient.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore'; // Import the store
import { ApiResponse } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response, // Directly return successful responses
  (error: AxiosError<ApiResponse<any>>) => { // Type the error data if possible
    const { response, config } = error;

    if (response) {
      // Handle 401 Unauthorized specifically (e.g., token expired)
      if (response.status === 401) {
        // Avoid logout loop if the error is from login attempt or if no config (should not happen)
        const originalRequestUrl = config?.url;
        if (originalRequestUrl && !originalRequestUrl.endsWith('/auth/login') && !originalRequestUrl.endsWith('/auth/me')) {
          console.warn('Unauthorized access (401). Logging out user.');
          useAuthStore.getState().logout();
          // Optionally redirect to login, can be handled by router based on auth state
          // window.location.href = '/login';
        }
      }

      // Construct a more informative error message
      let errorMessage = `API Error: Status ${response.status}`;
      if (response.data) {
        if (response.data.error) {
          errorMessage = response.data.error;
        } else if (response.data.errors && Array.isArray(response.data.errors)) {
          errorMessage = response.data.errors.map(e => e.msg || JSON.stringify(e)).join(', ');
        } else if (response.data.message) {
          errorMessage = response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Instead of just rejecting with the error, reject with a new Error object
      // that has a more structured message, or even a custom error class.
      // This makes it easier for calling code (services/stores) to handle.
      const customError = new Error(errorMessage);
      (customError as any).originalError = error; // Keep original error if needed
      (customError as any).statusCode = response.status;
      (customError as any).errorDetails = response.data?.errors;

      return Promise.reject(customError);
    } else if (error.request) {
      // Network error (request was made but no response received)
      console.error('Network Error:', error.message);
      return Promise.reject(new Error('Network error, please check your connection.'));
    } else {
      // Something else happened (e.g., error setting up the request)
      console.error('API Client Error:', error.message);
      return Promise.reject(new Error(`Request setup error: ${error.message}`));
    }
  }
);

export default apiClient;
