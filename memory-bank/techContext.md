# Technical Context - Recipe AI

## Technologies Used

### Frontend Technologies
- **React 18.2.0**: Modern React with concurrent features and automatic batching
- **TypeScript 5.2.2**: Static type checking for improved code quality and developer experience
- **Vite 5.1.0**: Fast build tool and development server with HMR
- **Tailwind CSS 3.4.0**: Utility-first CSS framework for rapid UI development
- **shadcn/ui**: High-quality React components built on Radix UI and Tailwind
- **Radix UI**: Accessible, unstyled UI primitives (@radix-ui/react-tabs, @radix-ui/react-dialog, @radix-ui/react-alert-dialog, @radix-ui/react-select)
- **React Router 6.20.0**: Declarative routing for React applications
- **Zustand 4.4.0**: Lightweight state management solution
- **TanStack Query 5.14.0**: Powerful data synchronization for React
- **React Hook Form 7.48.0**: Performant forms with easy validation
- **Zod 3.22.0**: TypeScript-first schema validation
- **Axios 1.6.0**: HTTP client for API communication

### Backend Technologies
- **Node.js 18+**: JavaScript runtime for server-side development
- **Express.js 5.0.0**: Fast, unopinionated web framework for Node.js
- **PostgreSQL 15**: Advanced open-source relational database
- **JWT (jsonwebtoken 9.0.0)**: JSON Web Tokens for authentication
- **bcryptjs 2.4.3**: Password hashing for security
- **pg 8.11.0**: PostgreSQL client for Node.js
- **CORS 2.8.5**: Cross-origin resource sharing middleware
- **Helmet 7.1.0**: Security middleware for Express
- **Swagger/OpenAPI**: API documentation and validation

### DevOps & Deployment
- **Docker 24+**: Containerization platform
- **Docker Compose**: Multi-container application orchestration
- **Nginx**: Web server and reverse proxy
- **Portainer**: Docker container management UI
- **Git**: Version control system

### Development Tools
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **TypeScript Compiler**: Type checking and compilation
- **Vite Dev Server**: Development server with hot reload
- **npm**: Package management

## Development Setup

### Local Development Environment
```bash
# Prerequisites
- Node.js 18+
- Docker Desktop
- Git
- VS Code (recommended)

# Clone and setup
git clone https://github.com/mrskaggs/recipe-ai.git
cd recipe-ai

# Install dependencies
npm install  # Root dependencies
cd api && npm install
cd ../frontend && npm install

# Environment setup
cp api/.env.example api/.env
cp frontend/.env.example frontend/.env

# Start development environment
docker-compose up -d  # Start database
cd api && npm run dev  # Start API server
cd ../frontend && npm run dev  # Start frontend
```

### Docker Development Workflow
```yaml
# docker-compose.yml configuration
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: recipes
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password123
    ports: ["5432:5432"]

  api:
    build: ./api
    environment:
      NODE_ENV: development
      DB_HOST: postgres
    ports: ["3001:3001"]
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports: ["8080:80"]
    depends_on: [api]
```

## Technical Constraints

### Performance Requirements
- **Frontend Load Time**: < 2 seconds initial page load
- **API Response Time**: < 500ms for most endpoints
- **Database Query Time**: < 100ms for typical queries
- **Concurrent Users**: Support 1000+ simultaneous users
- **Uptime**: 99.9% availability target

### Security Requirements
- **Password Hashing**: bcrypt with minimum 12 salt rounds
- **JWT Expiration**: Access tokens expire in 1 hour
- **HTTPS**: All production traffic must be encrypted
- **Input Validation**: All user inputs validated and sanitized
- **CORS**: Properly configured cross-origin policies
- **Rate Limiting**: API rate limiting to prevent abuse

### Scalability Considerations
- **Database Connections**: Connection pooling with pg.Pool
- **API Scaling**: Stateless design for horizontal scaling
- **Static Assets**: CDN-ready asset optimization
- **Caching Strategy**: Redis integration planned for future
- **Microservices Ready**: API-first design for service decomposition

## Dependencies and Package Management

### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.14.0",
    "axios": "^1.6.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.0.0",
    "postcss": "^8.4.0",
    "typescript": "^5.2.0",
    "vite": "^5.1.0"
  }
}
```

### Backend Dependencies
```json
{
  "dependencies": {
    "express": "^5.0.0",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "swagger-jsdoc": "^6.2.0",
    "swagger-ui-express": "^5.0.0",
    "axios": "^1.6.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0",
    "supertest": "^6.0.0"
  }
}
```

## Environment Configuration

### API Environment Variables
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recipes
DB_USER=postgres
DB_PASSWORD=password123

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=1h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRE=7d
BCRYPT_ROUNDS=12

# External Services
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/recipe-processor

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Frontend Environment Variables
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Development
VITE_APP_ENV=development
```

## Tool Usage Patterns

### Development Workflow
1. **Feature Development**: Create feature branch from main
2. **Code Changes**: Make changes with hot reload active
3. **Testing**: Run tests and linting before commit
4. **Commit**: Follow conventional commit format
5. **Pull Request**: Create PR with description and screenshots
6. **Code Review**: Address review feedback
7. **Merge**: Squash merge to main branch

### Docker Usage
```bash
# Development
docker-compose up -d          # Start all services
docker-compose logs -f api    # Follow API logs
docker-compose exec api sh    # Access API container

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Database Management
```bash
# Local development
docker-compose exec postgres psql -U postgres -d recipes

# Migrations (future)
npm run migrate
npm run seed
```

## Build and Deployment

### Development Build
```bash
# Frontend
cd frontend
npm run build  # Creates dist/ directory

# API
cd api
npm run build  # If using TypeScript
```

### Production Deployment
```bash
# Using Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Using Portainer
# 1. Upload docker-compose.yml
# 2. Set environment variables
# 3. Deploy stack
```

### CI/CD Pipeline (Future)
```yaml
# GitHub Actions workflow
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploy logic here"
```

## Monitoring and Logging

### Application Logging
- **API Logs**: Request/response logging with Morgan
- **Error Tracking**: Centralized error logging
- **Database Logs**: Query logging in development
- **Performance Monitoring**: Response time tracking

### Infrastructure Monitoring
- **Docker Logs**: Container logs aggregation
- **Health Checks**: Application health endpoints
- **Database Monitoring**: Connection pool status
- **Resource Usage**: CPU, memory, disk monitoring

## Future Technical Enhancements

### Planned Technology Additions
- **Redis**: Caching layer for improved performance
- **RabbitMQ**: Message queue for background processing
- **Elasticsearch**: Advanced search capabilities
- **AWS S3**: File storage for recipe images
- **SendGrid**: Email notifications
- **Stripe**: Premium subscription payments

### Architecture Evolution
- **Microservices**: Split monolithic API into services
- **GraphQL**: Flexible API querying
- **Serverless**: AWS Lambda for specific functions
- **CDN**: Global content delivery
- **Load Balancing**: Nginx load balancer configuration
