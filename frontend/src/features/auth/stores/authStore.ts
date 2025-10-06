import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';
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

          toast.success('Welcome back!', {
            description: 'You have been successfully logged in.',
          });
        } catch (error) {
          set({ isLoading: false });
          toast.error('Login Failed', {
            description: error instanceof Error ? error.message : 'Please check your credentials and try again.',
          });
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

          toast.success('Account Created!', {
            description: 'Welcome to Recipe AI! Your account has been created successfully.',
          });
        } catch (error) {
          set({ isLoading: false });
          toast.error('Registration Failed', {
            description: error instanceof Error ? error.message : 'Please check your information and try again.',
          });
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

        toast.success('Logged Out', {
          description: 'You have been successfully logged out.',
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

          toast.success('Profile Updated', {
            description: 'Your profile information has been successfully updated.',
          });

          return updatedUser;
        } catch (error) {
          set({ isLoading: false });
          toast.error('Profile Update Failed', {
            description: error instanceof Error ? error.message : 'Please try again.',
          });
          throw error;
        }
      },

      // Change password
      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true });
        try {
          await authApi.changePassword(currentPassword, newPassword);
          set({ isLoading: false });

          toast.success('Password Changed', {
            description: 'Your password has been successfully updated.',
          });
        } catch (error) {
          set({ isLoading: false });
          toast.error('Password Change Failed', {
            description: error instanceof Error ? error.message : 'Please check your current password and try again.',
          });
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
