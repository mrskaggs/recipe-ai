# Recipe API - Git Deployment Guide

This guide shows how to deploy the Recipe API directly from Git using Portainer.

## 🚀 Quick Deployment from Git

### Step 1: Push to Git Repository
1. Initialize Git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial Recipe API setup"
   git branch -M main
   git remote add origin https://github.com/yourusername/recipe-ai.git
   git push -u origin main
   ```

### Step 2: Deploy in Portainer
1. **Go to Portainer** → **"Stacks"** → **"Add stack"**
2. **Choose "Repository"** as the build method
3. **Enter your Git repository URL**: `https://github.com/yourusername/recipe-ai.git`
4. **Set compose file path**: `docker-compose.yml`
5. **Click "Deploy the stack"**

## 📋 What Gets Deployed

### Services:
- **PostgreSQL Database** (port 5432)
  - Database: `recipes`
  - User: `postgres`
  - Password: `password123`
  - Includes sample data via `database/init.sql`

- **Recipe API** (port 3001)
  - Node.js Express server
  - All endpoints: GET/POST recipes, health check
  - Automatic dependency installation
  - Database connection with health checks

### API Endpoints:
- `GET /health` - Health check
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get specific recipe
- `POST /api/recipes` - Create recipe (n8n format supported)

## 🔧 Configuration

### Environment Variables (Optional)
You can override these in Portainer's environment variables section:
- `DB_HOST=postgres`
- `DB_PORT=5432`
- `DB_NAME=recipes`
- `DB_USER=postgres`
- `DB_PASSWORD=password123`
- `PORT=3001`
- `NODE_ENV=production`

### Ports Exposed:
- **3001** - API server
- **5432** - PostgreSQL (for external access if needed)

## 🧪 Testing Your Deployment

### Method 1: Simple Browser Test
Visit: `http://your-portainer-host:3001/health`

Expected response:
```json
{
  "status": "OK",
  "message": "Recipe API is running"
}
```

### Method 2: Using Test Script
From your local machine:
```bash
node simple-test.js http://your-portainer-host:3001
```

### Method 3: cURL Commands
```bash
# Health check
curl http://your-portainer-host:3001/health

# Get recipes
curl http://your-portainer-host:3001/api/recipes

# Create recipe (n8n format)
curl -X POST http://your-portainer-host:3001/api/recipes \
  -H "Content-Type: application/json" \
  -d '[{"output":{"title":"Test Recipe","servings":2,"ingredients":["1 cup flour"],"instructions":["Mix ingredients"],"macros_per_serving":{"calories":200,"protein_g":5,"carbs_g":40,"fat_g":2},"tags":["test"]}}]'
```

## 📁 Required Files for Git Deployment

Make sure your repository contains these files:
- `docker-compose.yml` - Main orchestration file
- `Dockerfile` - API container build instructions
- `package.json` - Node.js dependencies
- `server.js` - API server code
- `database/init.sql` - Database schema and sample data
- `.dockerignore` - Build optimization

## 🚨 Troubleshooting

### Container Issues:
1. **Check container logs** in Portainer
2. **Verify both containers are running** (postgres and api)
3. **Check health status** of PostgreSQL container

### Connection Issues:
1. **Firewall**: Ensure port 3001 is accessible
2. **Network**: Verify containers are on same network
3. **Database**: Check if PostgreSQL is accepting connections

### Build Issues:
1. **Git access**: Ensure repository is public or credentials are provided
2. **File paths**: Verify all referenced files exist in repository
3. **Docker context**: Check Dockerfile and build context

## 🎯 Next Steps

After successful deployment:
1. **Test all endpoints** using the test script
2. **Configure your n8n workflows** to use the API
3. **Set up monitoring** if needed
4. **Consider adding authentication** for production use

## 📝 Sample n8n Workflow Data

Your API accepts this exact format from n8n:
```json
[
  {
    "output": {
      "title": "Taco Meat and Mexican Red Rice Burritos",
      "servings": 6,
      "ingredients": ["907g (2 lbs) 96/4 lean ground beef", "1 medium red onion, diced"],
      "instructions": ["Combine paprika, garlic powder...", "Spray pan with cooking spray..."],
      "macros_per_serving": {
        "calories": 655,
        "protein_g": 64.3,
        "carbs_g": 54.7,
        "fat_g": 21.7
      },
      "tags": ["mexican", "tex-mex", "high-protein"],
      "notes": "Recipe notes here"
    }
  }
]
