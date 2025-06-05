// src/store/authStore.ts
import {create} from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import jwtDecode from 'jwt-decode';
import { authService } from '../services/authService';
import { AuthState, User, LoginPayload, RegisterPayload, ApiResponse } from '../types';
import { socketService } from '../services/socketService';

interface DecodedToken {
  userId: string;
  username: string;
  is_admin: boolean; // Ensure this matches token payload from backend
  exp: number;
  iat: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // This login is called after successful API login with the token
      login: async (token: string) => {
        try {
          const decoded = jwtDecode<DecodedToken>(token);
          // Validate crucial fields from token if necessary
          if (!decoded.userId || !decoded.exp) {
            throw new Error("Invalid token structure.");
          }

          set({ token, isAuthenticated: true, error: null, isLoading: true });
          // Fetch full user details using the token (via /auth/me)
          await get().fetchCurrentUser();
          // Connect WebSocket after user is confirmed and set
          if (get().isAuthenticated) {
            socketService.connect();
          } else {
            // If fetchCurrentUser failed and cleared auth state, don't connect.
            throw new Error("Failed to fetch user details after login.");
          }
        } catch (error: any) {
          console.error("Login process error:", error);
          set({ error: `Login failed: ${error.message || 'Invalid token or user fetch failed.'}`, isLoading: false, token: null, isAuthenticated: false, user: null });
          get().logout(); // Ensure clean state on error
        }
      },

      // This is the action to call from UI to perform login
      handleLogin: async (payload: LoginPayload): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(payload);
          if (response.success && response.data?.token) {
            await get().login(response.data.token); // Use the internal login with token
            set({ isLoading: false });
            return true;
          } else {
            throw new Error(response.error || response.message || 'Login API call failed');
          }
        } catch (error: any) {
          console.error("handleLogin API error:", error);
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      register: async (userData: RegisterPayload): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(userData);
          if (response.success && response.data) {
            set({ isLoading: false });
            // Optionally auto-login user here by calling handleLogin, or prompt user to login.
            // For now, just successful registration.
            return true;
          } else {
            throw new Error(response.error || response.message || 'Registration failed');
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error; // Re-throw for component to handle
        }
      },

      logout: () => {
        socketService.disconnect();
        set({ user: null, token: null, isAuthenticated: false, error: null, isLoading: false });
        // No need to clear apiClient headers if they are set per-request by interceptor
        console.log("User logged out and auth state cleared.");
      },

      fetchCurrentUser: async () => {
        // isLoading true is set by the caller (login) or can be set here if called independently
        // set({ isLoading: true, error: null });
        try {
          const response = await authService.getCurrentUser();
          if (response.success && response.data) {
            set({ user: response.data, isAuthenticated: true, isLoading: false, error: null });
          } else {
             throw new Error(response.error || response.message || 'Failed to fetch current user');
          }
        } catch (error: any) {
          console.error("fetchCurrentUser error:", error);
          // If fetching current user fails (e.g. token invalid), logout
          set({ error: `Session expired or invalid: ${error.message || 'Could not fetch user.'}`});
          get().logout(); // Critical to logout if user can't be fetched with existing token
        }
      },
    }),
    {
      name: 'supermodel-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }), // Only persist token
      onRehydrateStorage: (state) => {
        console.log("AuthStore: Rehydrating token from localStorage");
        // This is called when the store is rehydrated from localStorage
        // We can trigger initializeAuth here if needed, but initializeAuth also called from App.tsx
        return (currentState, error) => {
          if (error) {
            console.error("AuthStore: Failed to rehydrate from localStorage:", error);
          }
          if (currentState && currentState.token) {
            // Token is loaded, initializeAuth will verify it and fetch user
            // initializeAuth(); // No, this creates a loop / too early. Call from App.
          }
        }
      }
    }
  )
);

// This function should be called once when the app initializes (e.g., in root App.tsx)
export const initializeAuth = async () => {
    console.log("Initializing authentication state...");
    const token = useAuthStore.getState().token;
    if (token) {
        try {
            const decoded = jwtDecode<DecodedToken>(token);
            if (decoded.exp * 1000 > Date.now()) {
                console.log("Token found and not expired. Fetching current user...");
                // Ensure isLoading is true before fetch, and token is already set for API client
                useAuthStore.setState({ isLoading: true });
                await useAuthStore.getState().fetchCurrentUser();
                if (useAuthStore.getState().isAuthenticated) {
                    socketService.connect();
                }
            } else {
                console.log("Token found but expired. Logging out.");
                useAuthStore.getState().logout();
            }
        } catch (e) {
            console.error("Invalid token found during initialization. Logging out.", e);
            useAuthStore.getState().logout();
        }
    } else {
        console.log("No token found. User is not authenticated.");
    }
    // Ensure loading is false if no token or if any error before fetchCurrentUser
    if(useAuthStore.getState().isLoading && !token) {
        useAuthStore.setState({ isLoading: false });
    }
};
