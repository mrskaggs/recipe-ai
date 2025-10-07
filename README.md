# Recipe AI - Full Stack Recipe Management Application

A complete recipe management application with React frontend, Node.js API, and PostgreSQL database, designed for production deployment.

## Features

### Frontend (React + TypeScript)
- Modern React 18 with TypeScript and Vite
- Responsive design with Tailwind CSS and shadcn/ui components
- Recipe browsing, searching, and filtering by popularity
- Print-friendly recipe cards
- Form validation with React Hook Form and Zod
- State management with TanStack Query and Zustand
- **Social Features**: Author attribution, popularity metrics, profile browsing

### Backend API
- RESTful API with Express.js
- PostgreSQL database with comprehensive schema
- N8n workflow integration for recipe processing
- Health check endpoints
- Advanced search and filtering with social metrics
- **Social Analytics**: recipe views, likes, favorites tracking
- **User Management**: display names and profile attribution

### Social Recipe Platform
- **Author Attribution**: See who created each recipe with clickable profiles
- **Popularity Metrics**: View counts, likes, and favorites to discover trending content
- **Profile Discovery**: Browse other users' recipe collections
- **Community Engagement**: Social signals for recipe discovery

### Production Ready
- Docker multi-stage builds
- Nginx for static file serving
- Non-root container security
- Environment-based configuration

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository
2. Copy `.env` file and adjust ports if needed:
   ```bash
   cp .env .env.local
   # Edit .env.local with your preferred ports
   ```
3. Run the application:
   ```bash
   docker-compose up -d
   ```
4. Access the application:
   - Frontend: http://localhost:8080 (or your configured FRONTEND_PORT)
   - API: http://localhost:3001 (or your configured API_PORT)
   - API Documentation: http://localhost:3001/api-docs

## Port Configuration

The application uses configurable ports to avoid conflicts:

- **Frontend**: Port 8080 (default) - configurable via `FRONTEND_PORT`
- **API**: Port 3001 (default) - configurable via `API_PORT`
- **Database**: Port 5432 (internal to Docker network)

### Changing Ports

Edit the `.env` file or set environment variables:

```bash
# For different ports
FRONTEND_PORT=9000
API_PORT=9001
```

Or set them when running:
```bash
FRONTEND_PORT=9000 API_PORT=9001 docker-compose up -d
```

## Deployment with Portainer

### Method 1: Git Repository (Recommended)

1. In Portainer, go to "Stacks" → "Add stack"
2. Choose "Repository" as the build method
3. Enter your Git repository URL: `https://github.com/mrskaggs/recipe-ai.git`
4. Set the compose file path to `docker-compose.yml`
5. **Add environment variables** to avoid port conflicts:
   ```
   FRONTEND_PORT=8080
   API_PORT=3001
   ```
   (Adjust ports as needed for your environment)
6. Deploy the stack

### Method 2: Upload Files

1. Create a ZIP file containing all project files
2. In Portainer, go to "Stacks" → "Add stack"
3. Choose "Upload" as the build method
4. Upload your ZIP file
5. **Set environment variables** before deploying:
   ```
   FRONTEND_PORT=8080
   API_PORT=3001
   ```
6. Deploy the stack

### Method 3: Web Editor

1. In Portainer, go to "Stacks" → "Add stack"
2. Choose "Web editor"
3. Copy and paste the contents of `docker-compose.yml`
4. **Important**: Set environment variables in Portainer:
   - `FRONTEND_PORT=8080` (or any available port)
   - `API_PORT=3001` (or any available port)
5. Deploy the stack

## Environment Variables

### Required for Deployment
- `FRONTEND_PORT`: Port for frontend access (default: 8080)
- `API_PORT`: Port for API access (default: 3001)
- `API_BASE_URL`: API base URL for frontend (default: /api)

### API URL Configuration Options
Choose the appropriate `API_BASE_URL` based on your deployment:

1. **Nginx Proxy (Recommended)**: `API_BASE_URL=/api`
   - Frontend requests go to `/api/recipes`, nginx proxies to backend
   - Single port access, better security

2. **External API Server**: `API_BASE_URL=http://your-server-ip:3001`
   - Direct connection to external API server
   - Use when API and frontend are deployed separately

3. **Docker Network**: `API_BASE_URL=http://recipe-api:3001`
   - Direct container-to-container communication
   - Only for development or server-side requests

### Optional Configuration
- `POSTGRES_DB`: Database name (default: recipes)
- `POSTGRES_USER`: Database user (default: postgres)
- `POSTGRES_PASSWORD`: Database password (default: password123)
- `N8N_WEBHOOK_URL`: Your n8n webhook URL for recipe processing

## API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api/recipes` - Get all recipes with social features and search/filter support
- `GET /api/recipes/:id` - Get specific recipe with author and popularity data
- `POST /api/recipes` - Create new recipe
- `GET /api/recipes/search` - Search recipes
- `GET /api/recipes/tags` - Get available tags

### Social Features Endpoints
- `GET /api/user/recipes` - Get authenticated user's recipes
- **Popularity Sorting**: Sort by `view_count`, `like_count`, `favorite_count`
- **Author Attribution**: All recipes include user information
- **Social Metrics**: View counts, likes, and favorites for each recipe

### Search Parameters
- `q`: Search query (searches title, ingredients, instructions)
- `tags`: Filter by tags (comma-separated)
- `sort`: Sort by `title`, `createdAt`, `view_count`, `like_count`, `favorite_count`
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)

Example: `GET /api/recipes?sort=view_count&order=desc&limit=10`

## Recipe Submission

The application supports two ways to add recipes:

### 1. Direct Form Submission
Use the frontend form to manually enter recipe details.

### 2. N8n Webhook Integration
Submit raw recipe text that gets processed by n8n workflow:

```bash
curl -X POST http://localhost:3001/api/recipes/submit \
  -H "Content-Type: application/json" \
  -d '{"recipeText": "Your raw recipe text here"}'
```

## Troubleshooting

### Port Conflicts
If you get "address already in use" errors:

1. Check what's using the port: `netstat -tulpn | grep :3000`
2. Change the port in `.env` file:
   ```
   FRONTEND_PORT=8080
   API_PORT=3001
   ```
3. Or set different ports in Portainer environment variables

### Database Connection Issues
1. Check container logs: `docker-compose logs postgres`
2. Verify environment variables are set correctly
3. Ensure containers are on the same network
4. Wait for database initialization (can take 30-60 seconds)

### Build Failures
1. Ensure all files are present in build context
2. Check Docker logs: `docker-compose logs api` or `docker-compose logs frontend`
3. Verify Dockerfile paths are correct
4. Clear Docker cache: `docker system prune -a`

## Development

### Local Development Setup

1. Install dependencies:
   ```bash
   # Backend
   cd api && npm install
   
   # Frontend
   cd frontend && npm install
   ```

2. Set up environment variables:
   ```bash
   cp api/.env.example api/.env
   cp frontend/.env.example frontend/.env
   ```

3. Run with Docker:
   ```bash
   docker-compose up -d
   ```

4. Or run separately:
   ```bash
   # Database
   docker-compose up -d postgres
   
   # API (in api/ directory)
   npm run dev
   
   # Frontend (in frontend/ directory)
   npm run dev
   ```

### Testing

```bash
# Frontend tests
cd frontend && npm test

# API tests
cd api && npm test
```

## Automatic Database Migration

**The application now automatically handles all database migrations on startup!**

Simply deploy the updated containers and the application will:
1. ✅ **Automatically detect** existing database schema
2. ✅ **Run migration scripts** when the API container starts
3. ✅ **Add new social features** without manual intervention
4. ✅ **Preserve existing data** - no data loss
5. ✅ **Handle deployment updates** seamlessly

### What Gets Added Automatically
- `display_name` column to users table (populated from username or email)
- `recipe_views` table for view tracking
- `recipe_favorites` table for user favorites
- `recipe_likes` table for recipe likes
- All necessary indexes for performance
- Backward compatibility with existing data

### Manual Migration (Still Available)
If you prefer manual control, you can still run migrations separately:
```bash
docker exec -it recipe-postgres psql -U postgres -d recipes -f api/database/migration.sql
```

**Note**: Automatic migration runs on every container startup, so it will safely skip already-applied migrations.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │   Express API   │    │   PostgreSQL    │
│   (Port 8080)   │◄──►│   (Port 3001)   │◄──►│   (Port 5432)   │
│   Social Features│    │ Social APIs    │    │ Social Schema   │
│   Nginx + Vite  │    │   Node.js       │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   N8n Webhook   │
                       │   Integration   │
                       └─────────────────┘
```

## License

MIT License - see LICENSE file for details.
