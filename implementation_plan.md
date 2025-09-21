# Implementation Plan

Implement a secure authentication system with JWT-based login, password hashing, and role-based access control (admin/user) for the recipe application. All user data will be stored securely with hashed passwords that cannot be reversed, and access tokens will be properly managed with expiration and refresh mechanisms.

The system will add user registration, login, logout, and protected routes to the existing Node.js Express API and React frontend. User roles will control access to administrative features, with admin users having full access and regular users having limited permissions. Passwords will be hashed using bcrypt, and JWT tokens will be signed with secure secrets.

[Types]
Define TypeScript interfaces for user authentication, roles, and JWT payloads.

Core types:
- User: id, email, username?, role ('admin'|'user'), createdAt, updatedAt
- LoginRequest: email, password
- RegisterRequest: email, password, username?
- AuthResponse: user, token, refreshToken?
- JWTPayload: userId, email, role, iat, exp
- Role: 'admin' | 'user'

API response types will extend existing OpenAPI spec with authentication endpoints.

[Files]
Add authentication components and API routes to the existing application structure.

New files:
- api/models/User.js - User model with database operations
- api/routes/auth.js - Authentication routes (register, login, logout, refresh)
- api/middleware/auth.js - JWT authentication middleware
- api/middleware/roleCheck.js - Role-based access control middleware
- frontend/src/features/auth/components/LoginForm.tsx - Login form component
- frontend/src/features/auth/components/RegisterForm.tsx - Registration form
- frontend/src/features/auth/pages/Login.tsx - Login page
- frontend/src/features/auth/pages/Register.tsx - Registration page
- frontend/src/features/auth/hooks/useAuth.ts - Authentication hooks
- frontend/src/features/auth/stores/authStore.ts - Zustand auth store
- frontend/src/lib/auth.ts - Authentication utilities (token management)
- frontend/src/types/auth.ts - Authentication types

Modified files:
- api/server.js - Add auth routes and middleware
- api/database/init.sql - Add users table
- api/openapi.yaml - Add authentication endpoints
- frontend/src/App.tsx - Add protected routes
- frontend/src/lib/api.ts - Add auth API functions
- frontend/src/stores/recipeStore.ts - Integrate with auth state

[Functions]
New authentication functions in api/routes/auth.js:
- register(userData) - Create new user with hashed password
- login(credentials) - Validate credentials and return JWT
- logout(token) - Invalidate token (optional for JWT)
- refreshToken(refreshToken) - Issue new access token

New middleware functions:
- authenticateToken(req, res, next) - Verify JWT token
- requireRole(role) - Check user role permissions

New frontend functions:
- login(credentials) - API call and store tokens
- logout() - Clear tokens and state
- refreshToken() - Get new access token
- isAuthenticated() - Check if user is logged in
- getCurrentUser() - Get current user from token

[Classes]
No new classes; using functional components and hooks.

AuthStore class in frontend/src/features/auth/stores/authStore.ts:
- AuthStore: user, token, isAuthenticated, login, logout, refreshToken

[Dependencies]
New npm packages:
- Backend: bcryptjs (^2.4.3), jsonwebtoken (^9.0.2)
- Frontend: @hookform/resolvers (^3.3.4), react-hook-form (^7.51.2), zod (^3.22.4)

Environment variables:
- JWT_SECRET - Secret key for signing tokens
- JWT_EXPIRE - Token expiration time (e.g., 1h)
- JWT_REFRESH_SECRET - Secret for refresh tokens
- JWT_REFRESH_EXPIRE - Refresh token expiration (e.g., 7d)
- BCRYPT_ROUNDS - Salt rounds for password hashing (12)

[Testing]
Unit tests for authentication utilities and middleware.
Integration tests for auth endpoints with mocked database.
E2E tests for login/register flows.

Test files:
- api/test/auth.test.js - Auth route tests
- frontend/src/features/auth/__tests__/LoginForm.test.tsx
- frontend/src/lib/__tests__/auth.test.ts

[Implementation Order]
1. Add users table to database schema
2. Install backend dependencies and create User model
3. Implement authentication middleware and utilities
4. Create auth routes (register, login, refresh)
5. Update API to use authentication on protected routes
6. Install frontend dependencies and create auth types
7. Implement auth store and utilities
8. Create login/register components and pages
9. Add protected routes and role-based access
10. Update OpenAPI spec with auth endpoints
11. Add tests and validation
12. Test full authentication flow
