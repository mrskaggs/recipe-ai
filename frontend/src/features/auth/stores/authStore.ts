import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AuthStore, LoginRequest, RegisterRequest, User } from '../../../types/auth';
import { authApi, tokenStorage, initializeAuth } from '../../../lib/auth';

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Initialize from localStorage
      initialize: () => {
        const authData = initializeAuth();
        set({
          user: authData.user,
          token: authData.token,
          refreshToken: authData.refreshToken,
          isAuthenticated: authData.isAuthenticated || false,
          isLoading: false,
        });
      },

      // Login
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(credentials);

          // Store tokens and user
          tokenStorage.setToken(response.token);
          tokenStorage.setRefreshToken(response.refreshToken);
          tokenStorage.setUser(response.user);

          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Register
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(userData);

          // Store tokens and user
          tokenStorage.setToken(response.token);
          tokenStorage.setRefreshToken(response.refreshToken);
          tokenStorage.setUser(response.user);

          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout
      logout: () => {
        tokenStorage.clearAll();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      // Refresh auth token
      refreshAuthToken: async () => {
        const currentRefreshToken = get().refreshToken;
        if (!currentRefreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await authApi.refreshToken();

          // Update tokens
          tokenStorage.setToken(response.token);
          tokenStorage.setRefreshToken(response.refreshToken);
          tokenStorage.setUser(response.user);

          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
          });
        } catch (error) {
          // If refresh fails, logout
          get().logout();
          throw error;
        }
      },

      // Update profile
      updateProfile: async (updates: Partial<Pick<User, 'username' | 'email'>>) => {
        set({ isLoading: true });
        try {
          const updatedUser = await authApi.updateProfile(updates);

          // Update stored user
          tokenStorage.setUser(updatedUser);

          set({
            user: updatedUser,
            isLoading: false,
          });

          return updatedUser;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Change password
      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true });
        try {
          await authApi.changePassword(currentPassword, newPassword);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'auth-store',
    }
  )
);

// Initialize the store on app start
useAuthStore.getState().initialize();
