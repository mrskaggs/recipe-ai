import { useAuthStore } from '../stores/authStore';
import { authUtils } from '../../../lib/auth';

// Custom hook for authentication
export const useAuth = () => {
  const store = useAuthStore();

  return {
    // State
    user: store.user,
    token: store.token,
    refreshToken: store.refreshToken,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,

    // Actions
    login: store.login,
    register: store.register,
    logout: store.logout,
    refreshAuthToken: store.refreshAuthToken,
    updateProfile: store.updateProfile,
    changePassword: store.changePassword,

    // Utilities
    hasRole: (role: string) => authUtils.hasRole(role),
    getCurrentUser: () => authUtils.getCurrentUser(),
    getCurrentUserRole: () => authUtils.getCurrentUserRole(),
  };
};
