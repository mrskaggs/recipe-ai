# System Patterns - Recipe AI

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Express API   │    │   PostgreSQL    │
│   (Port 8080)   │◄──►│   (Port 3001)   │◄──►│   (Port 5432)   │
│   Nginx + Vite  │    │   Node.js       │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Docker        │    │   JWT Auth      │    │   Connection    │
│   Containers    │    │   System        │    │   Pooling       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   N8n Webhook   │
                       │   Integration   │
                       └─────────────────┘
```

### Component Relationships

#### Frontend Layer
- **React 18 + TypeScript**: Modern component-based architecture
- **Vite**: Fast development server and optimized production builds
- **React Router**: Client-side routing with protected routes
- **Zustand**: Lightweight state management for authentication
- **TanStack Query**: Server state management and caching
- **React Hook Form + Zod**: Form validation and type safety

#### API Layer
- **Express.js**: RESTful API server with middleware architecture
- **JWT Authentication**: Token-based authentication with refresh tokens
- **Role-based Access Control**: Middleware for admin/user permissions
- **OpenAPI/Swagger**: API documentation and validation
- **Error Handling**: Structured error responses and logging

#### Database Layer
- **PostgreSQL 15**: Relational database with ACID compliance
- **Connection Pooling**: Efficient database connection management
- **Indexing Strategy**: Optimized queries for search and filtering
- **Data Integrity**: Foreign keys and constraints for consistency

## Key Technical Decisions

### Authentication Pattern
```javascript
// JWT Token Flow
1. User Login → Validate Credentials → Generate JWT Pair
2. Access Token (short-lived) + Refresh Token (long-lived)
3. Middleware validates tokens on protected routes
4. Automatic token refresh on expiration
5. Secure logout invalidates refresh token
```

### Database Schema Patterns
```sql
-- User Table Pattern
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Relationship Pattern
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  -- Core recipe data
);

CREATE TABLE recipe_ingredients (
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL
);

-- Many-to-many with junction table
CREATE TABLE recipe_tags (
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
```

### API Response Patterns
```javascript
// Success Response
{
  "data": { /* actual data */ },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}

// Error Response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { /* specific field errors */ }
  }
}
```

## Design Patterns in Use

### Repository Pattern (Backend)
```javascript
// User Repository
class UserRepository {
  async findByEmail(email) {
    return await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  }

  async create(userData) {
    return await pool.query('INSERT INTO users (...) VALUES (...)', [...]);
  }
}
```

### Service Layer Pattern
```javascript
// Auth Service
class AuthService {
  constructor(userRepository, jwtService) {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
  }

  async login(credentials) {
    const user = await this.userRepository.findByEmail(credentials.email);
    // Validate password, generate tokens
  }
}
```

### Custom Hook Pattern (Frontend)
```javascript
// Authentication Hook
function useAuth() {
  const { user, login, logout } = useAuthStore();

  const isAuthenticated = useMemo(() => !!user, [user]);
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  return { user, login, logout, isAuthenticated, isAdmin };
}
```

### Container/Presentational Pattern (Frontend)
```javascript
// Container Component
function RecipeListContainer() {
  const { data: recipes, isLoading } = useRecipes();
  const { user } = useAuth();

  return <RecipeList recipes={recipes} isLoading={isLoading} user={user} />;
}

// Presentational Component
function RecipeList({ recipes, isLoading, user }) {
  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {recipes.map(recipe => (
        <RecipeCard key={recipe.id} recipe={recipe} canEdit={user?.isAdmin} />
      ))}
    </div>
  );
}
```

## Critical Implementation Paths

### Recipe Creation Flow
1. **Frontend**: User submits recipe form or raw text
2. **API**: Validates input, authenticates user (if required)
3. **Processing**: Routes to n8n webhook for AI processing or direct database insert
4. **Database**: Stores recipe with relationships (ingredients, instructions, tags)
5. **Response**: Returns created recipe with proper formatting

### Authentication Flow
1. **Login**: Validate credentials against database
2. **Token Generation**: Create JWT access + refresh tokens
3. **Storage**: Store tokens securely in frontend
4. **Middleware**: Validate tokens on protected routes
5. **Refresh**: Automatically refresh expired access tokens

### Search and Filtering Flow
1. **Query Building**: Construct SQL query with WHERE clauses
2. **Parameter Binding**: Safe parameter binding to prevent SQL injection
3. **Indexing**: Utilize database indexes for performance
4. **Pagination**: Implement cursor-based or offset pagination
5. **Response**: Format results with metadata (total count, pages)

## Component Relationships

### Frontend Component Hierarchy
```
App
├── Layout
│   ├── Header
│   │   ├── Navigation
│   │   └── UserMenu
│   └── Main
│       ├── Routes
│       │   ├── HomePage
│       │   ├── RecipeList
│       │   ├── RecipeDetail
│       │   ├── RecipeSubmit
│       │   ├── LoginPage
│       │   └── RegisterPage
│       └── Footer
```

### API Route Structure
```
/api
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   └── POST /logout
├── /admin
│   ├── /users
│   │   ├── GET / (list users with pagination/search)
│   │   ├── GET /:id (get single user)
│   │   ├── PUT /:id (update user)
│   │   └── DELETE /:id (delete user)
│   └── /recipes
│       ├── GET / (list recipes for admin)
│       ├── GET /:id (get single recipe)
│       ├── PUT /:id (update recipe)
│       └── DELETE /:id (delete recipe)
├── /recipes
│   ├── GET / (list with pagination/filtering)
│   ├── GET /search (search recipes)
│   ├── GET /:id (get single recipe)
│   ├── POST / (create recipe - authenticated)
│   └── POST /submit (submit for AI processing)
├── /tags
│   └── GET / (get all tags with counts)
└── /health
    └── GET / (health check)
```

### Database Relationships
```
users (1) ──── (many) user_sessions
  │
  └── (1) ──── (many) recipes (user ownership - future)
                │
                ├── (1) ──── (many) recipe_ingredients
                ├── (1) ──── (many) recipe_instructions
                └── (many) ──── (many) tags
                      via recipe_tags junction
```

## Error Handling Patterns

### API Error Handling
```javascript
// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication Required'
    });
  }

  res.status(500).json({
    error: 'Internal Server Error'
  });
});
```

### Frontend Error Boundaries
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}
```

## Performance Optimization Patterns

### Database Query Optimization
- **Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Reuse database connections
- **Query Batching**: Combine multiple queries when possible
- **Pagination**: Limit result sets with proper pagination

### Frontend Performance
- **Code Splitting**: Lazy load routes and components
- **Image Optimization**: Proper image formats and lazy loading
- **Caching**: Browser caching and service worker caching
- **Bundle Optimization**: Tree shaking and minification

### API Performance
- **Rate Limiting**: Prevent abuse with request throttling
- **Caching**: Redis caching for frequently accessed data
- **Compression**: Gzip compression for responses
- **Async Processing**: Background jobs for heavy operations
