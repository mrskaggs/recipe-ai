// Authentication types

export type Role = 'admin' | 'user';

export interface User {
  id: number;
  email: string;
  username?: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: Role;
  iat: number;
  exp: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthStore extends AuthState {
  initialize: () => void;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshAuthToken: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'username' | 'email'>>) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}
