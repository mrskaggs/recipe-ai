# Recipe Tracker API

A Node.js Express API with PostgreSQL database for managing recipes, designed to work with n8n workflows.

## Features

- RESTful API for recipe management
- PostgreSQL database with proper schema
- Docker containerization
- Health check endpoints
- Support for n8n workflow integration

## API Endpoints

### GET /health
Health check endpoint

### GET /api/recipes
Get all recipes with ingredients, instructions, and tags

### GET /api/recipes/:id
Get a specific recipe by ID

### POST /api/recipes
Create a new recipe (accepts n8n workflow format)

Expected POST format:
```json
[
  {
    "output": {
      "title": "Recipe Title",
      "servings": 4,
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["step 1", "step 2"],
      "macros_per_serving": {
        "calories": 500,
        "protein_g": 25,
        "carbs_g": 50,
        "fat_g": 15
      },
      "tags": ["tag1", "tag2"],
      "notes": "Optional notes"
    }
  }
]
```

## Deployment with Portainer

### Option 1: Using Git Repository (Recommended)

1. In Portainer, go to "Stacks" → "Add stack"
2. Choose "Repository" as the build method
3. Enter your Git repository URL
4. Set the compose file path to `docker-compose.yml`
5. Add environment variables if needed
6. Deploy the stack

### Option 2: Upload ZIP File

**Easy way - Use the provided scripts:**
1. Run `create-portainer-zip.bat` (Windows) or `create-portainer-zip.ps1` (PowerShell)
2. This creates `recipe-api-portainer.zip` with all necessary files

**Manual way - Create ZIP file containing:**
   - `docker-compose.yml`
   - `Dockerfile`
   - `package.json`
   - `server.js`
   - `.dockerignore`
   - `database/init.sql` (in database folder)

**Deploy in Portainer:**
1. In Portainer, go to "Stacks" → "Add stack"
2. Choose "Upload" as the build method
3. Upload your `recipe-api-portainer.zip` file
4. Deploy the stack

**Important:** Make sure the ZIP file maintains the folder structure (database/init.sql should be in a database folder within the ZIP)

### Option 3: Copy-Paste

1. In Portainer, go to "Stacks" → "Add stack"
2. Choose "Web editor"
3. Copy and paste the contents of `docker-compose.yml`
4. Make sure all files are available in the build context

## Environment Variables

The following environment variables are used:

- `DB_HOST`: PostgreSQL host (default: postgres)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_NAME`: Database name (default: recipes)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: password123)
- `PORT`: API port (default: 3001)
- `NODE_ENV`: Environment (default: development)

## Testing the API

Once deployed, you can test the API:

1. Health check: `GET http://your-host:3001/health`
2. Get recipes: `GET http://your-host:3001/api/recipes`
3. Create recipe: `POST http://your-host:3001/api/recipes`

## Database Schema

The database includes the following tables:
- `recipes`: Main recipe information
- `recipe_ingredients`: Recipe ingredients
- `recipe_instructions`: Step-by-step instructions
- `tags`: Available tags
- `recipe_tags`: Recipe-tag relationships

## Troubleshooting

### Portainer Build Errors

If you get "failed to read dockerfile" errors:

1. Ensure all files are in the same directory
2. Check that the Dockerfile is named exactly `Dockerfile` (no extension)
3. Verify the build context includes all necessary files
4. Try using the explicit build context in docker-compose.yml:
   ```yaml
   build:
     context: .
     dockerfile: Dockerfile
   ```

### Database Connection Issues

1. Check that PostgreSQL container is healthy
2. Verify environment variables are set correctly
3. Ensure the API container can reach the postgres container
4. Check logs for connection errors

## Development

To run locally with Docker:
```bash
docker compose up -d
```

To run in development mode:
```bash
npm install
npm run dev
