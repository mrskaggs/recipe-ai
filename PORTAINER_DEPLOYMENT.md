# Portainer Deployment Guide for Recipe AI

## Quick Fix for Port Conflicts

The original error you encountered:
```
failed to bind host port for 0.0.0.0:3000:172.19.0.4:80/tcp: address already in use
```

Has been **RESOLVED** by updating the port configuration to use configurable ports with defaults that avoid common conflicts.

## Updated Port Configuration

- **Frontend**: Now uses port **8080** (instead of 3000)
- **API**: Uses port **3001** (configurable)
- **Database**: Port 5432 (internal to Docker network only)

## Deployment Methods

### Method 1: Git Repository (Recommended)

1. In Portainer, go to **Stacks** → **Add stack**
2. Choose **Repository** as the build method
3. Enter repository URL: `https://github.com/mrskaggs/recipe-ai.git`
4. Set compose file path: `docker-compose.yml`
5. **Add these environment variables** (adjust ports if needed):
   ```
   FRONTEND_PORT=8080
   API_PORT=3001
   API_BASE_URL=/api
   ```
6. Click **Deploy the stack**

### Method 2: Custom Ports (If 8080 is also in use)

If port 8080 is also occupied on your system, use different ports:

1. Follow Method 1 above
2. Set different environment variables:
   ```
   FRONTEND_PORT=9080
   API_PORT=9001
   API_BASE_URL=/api
   ```
3. Access your app at: `http://your-server:9080`

### Method 3: Upload Files

1. Download/clone the repository
2. Create a ZIP file with all project files
3. In Portainer: **Stacks** → **Add stack** → **Upload**
4. Upload the ZIP file
5. Set environment variables before deploying:
   ```
   FRONTEND_PORT=8080
   API_PORT=3001
   API_BASE_URL=/api
   ```

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_PORT` | 8080 | Port for web interface |
| `API_PORT` | 3001 | Port for API endpoints |
| `API_BASE_URL` | /api | API base URL for frontend - see API URL Configuration below |
| `POSTGRES_DB` | recipes | Database name |
| `POSTGRES_USER` | postgres | Database username |
| `POSTGRES_PASSWORD` | password123 | Database password |
| `N8N_WEBHOOK_URL` | (fake URL) | Your n8n webhook URL |

## API URL Configuration

The `API_BASE_URL` determines how the frontend connects to the backend API. **IMPORTANT**: This is a build-time variable that gets compiled into the frontend during Docker build.

### Option 1: Nginx Proxy (Recommended for Production)
```
API_BASE_URL=
```
(Leave empty or don't set this variable)
- **How it works**: Frontend makes requests to `/api/recipes`, nginx proxies to `http://api:3001/api/recipes`
- **Advantages**: Single port, cleaner URLs, better security
- **Use when**: Deploying the full stack together
- **Critical**: Must be empty (or unset) to avoid double `/api` paths

### Option 2: Direct External API Access
```
API_BASE_URL=http://192.168.40.142:3001
```
- **How it works**: Frontend makes direct requests to external API server
- **Use when**: API and frontend are deployed separately
- **Note**: Replace `192.168.40.142:3001` with your actual API server address

### Option 3: Internal Docker Network (Development)
```
API_BASE_URL=http://recipe-api:3001
```
- **How it works**: Frontend container connects directly to API container
- **Use when**: Both containers are on the same Docker network
- **Note**: Only works for server-side requests, not browser requests

### ⚠️ Critical Fix Applied

**Problem**: The frontend was making requests to `localhost:3001` instead of using the proxy, causing database connection issues.

**Root Cause**: Vite environment variables are processed at build time, not runtime. The `VITE_API_BASE_URL` needs to be available during the Docker build process.

**Solution**: Updated `Dockerfile.frontend` to accept `VITE_API_BASE_URL` as a build argument and updated `docker-compose.yml` to pass it correctly.

**Result**: Frontend now correctly uses the configured API base URL and connects to the proper database through Docker networking.

## After Deployment

1. **Frontend**: Access at `http://your-server:8080` (or your custom port)
2. **API**: Available at `http://your-server:3001` (or your custom port)
3. **API Docs**: Available at `http://your-server:3001/api-docs`

## Troubleshooting

### Still Getting Port Conflicts?

1. Check what's using the port:
   ```bash
   netstat -tulpn | grep :8080
   ```

2. Use different ports in Portainer environment variables:
   ```
   FRONTEND_PORT=9080
   API_PORT=9001
   ```

### Container Won't Start?

1. Check container logs in Portainer
2. Verify all environment variables are set
3. Ensure the repository URL is accessible
4. Wait for database initialization (30-60 seconds)

### Database Issues?

1. Check postgres container logs
2. Verify database environment variables
3. Ensure containers are on the same network
4. Database takes time to initialize on first run

## Testing Your Deployment

Once deployed, test these endpoints:

1. **Health Check**: `GET http://your-server:3001/health`
2. **Frontend**: Open `http://your-server:8080` in browser
3. **API Docs**: Open `http://your-server:3001/api-docs`

## Success Indicators

✅ Frontend loads without errors  
✅ API health check returns `{"status":"OK"}`  
✅ Database connection established  
✅ No port conflict errors in logs  

## Need Different Ports?

Simply update the environment variables in Portainer and redeploy:

- `FRONTEND_PORT=YOUR_PREFERRED_PORT`
- `API_PORT=YOUR_PREFERRED_API_PORT`

The application will automatically use your specified ports.
