import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// API_BASE_URL should be:
// - http://localhost:3001 for local development (without Docker)
// - Empty string ('') for Docker/ngrok deployment (nginx handles /api/* routing)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const baseURL = API_BASE_URL; // Use exactly what's set in .env

export const http: AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 60000, // Increased to 60 seconds to handle long-running AI processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
http.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
http.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && error.config && !error.config._retry) {
      // Handle token refresh for 401 errors
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          error.config._retry = true;

          // Try to refresh token
          const refreshResponse = await http.post('/api/auth/refresh', {
            refreshToken
          });

          // Update tokens in localStorage
          localStorage.setItem('authToken', refreshResponse.data.token);
          localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);
          localStorage.setItem('authUser', JSON.stringify(refreshResponse.data.user));

          // Retry the original request with new token
          error.config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
          return http.request(error.config);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('authUser');
          window.location.href = '/login';
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default http;
