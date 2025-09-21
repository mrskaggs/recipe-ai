import { http } from './http';
import type { User, LoginRequest, RegisterRequest, AuthResponse, JWTPayload } from '../types/auth';

// Token storage keys
const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'authUser';

// Token management utilities
export const tokenStorage = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  removeRefreshToken: (): void => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  getUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser: (): void => {
    localStorage.removeItem(USER_KEY);
  },

  clearAll: (): void => {
    tokenStorage.removeToken();
    tokenStorage.removeRefreshToken();
    tokenStorage.removeUser();
  }
};

// JWT token utilities
export const jwtUtils = {
  decodeToken: (token: string): JWTPayload | null => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch {
      return null;
    }
  },

  isTokenExpired: (token: string): boolean => {
    const decoded = jwtUtils.decodeToken(token);
    if (!decoded) return true;

    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  },

  getTokenExpiration: (token: string): Date | null => {
    const decoded = jwtUtils.decodeToken(token);
    if (!decoded) return null;

    return new Date(decoded.exp * 1000);
  }
};

// Authentication API calls
export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await http.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await http.post<AuthResponse>('/api/auth/register', userData);
    return response.data;
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await http.post<AuthResponse>('/api/auth/refresh', {
      refreshToken
    });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await http.get<{ user: User }>('/api/auth/me');
    return response.data.user;
  },

  updateProfile: async (updates: Partial<Pick<User, 'username' | 'email'>>): Promise<User> => {
    const response = await http.put<{ user: User }>('/api/auth/me', updates);
    return response.data.user;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await http.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
  }
};

// Authentication state utilities
export const authUtils = {
  isAuthenticated: (): boolean => {
    const token = tokenStorage.getToken();
    if (!token) return false;

    return !jwtUtils.isTokenExpired(token);
  },

  getCurrentUser: (): User | null => {
    return tokenStorage.getUser();
  },

  getCurrentUserRole: (): string | null => {
    const user = tokenStorage.getUser();
    return user?.role || null;
  },

  hasRole: (role: string): boolean => {
    const userRole = authUtils.getCurrentUserRole();
    return userRole === role || userRole === 'admin';
  },

  logout: (): void => {
    tokenStorage.clearAll();
  }
};

// Initialize auth state from storage
export const initializeAuth = () => {
  const token = tokenStorage.getToken();
  const refreshToken = tokenStorage.getRefreshToken();
  const user = tokenStorage.getUser();

  // Check if tokens are still valid
  if (token && jwtUtils.isTokenExpired(token)) {
    // Token is expired, try to refresh
    if (refreshToken && !jwtUtils.isTokenExpired(refreshToken)) {
      // Could automatically refresh here, but for now we'll let the store handle it
      console.log('Token expired, refresh token available');
    } else {
      // Both tokens expired, clear storage
      tokenStorage.clearAll();
    }
  }

  return {
    token: token && !jwtUtils.isTokenExpired(token) ? token : null,
    refreshToken: refreshToken && !jwtUtils.isTokenExpired(refreshToken) ? refreshToken : null,
    user: user || null,
    isAuthenticated: token && !jwtUtils.isTokenExpired(token)
  };
};
