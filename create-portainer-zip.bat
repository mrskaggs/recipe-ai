@echo off
echo Creating Portainer deployment ZIP file...

REM Create a temporary directory for the zip contents
if exist portainer-deploy rmdir /s /q portainer-deploy
mkdir portainer-deploy
mkdir portainer-deploy\database

REM Copy necessary files
copy docker-compose.yml portainer-deploy\
copy package.json portainer-deploy\
copy server.js portainer-deploy\
copy Dockerfile portainer-deploy\
copy .dockerignore portainer-deploy\
copy database\init.sql portainer-deploy\database\

REM Create the ZIP file (requires PowerShell)
powershell -command "Compress-Archive -Path 'portainer-deploy\*' -DestinationPath 'recipe-api-portainer.zip' -Force"

REM Clean up temporary directory
rmdir /s /q portainer-deploy

echo.
echo ✅ ZIP file created: recipe-api-portainer.zip
echo.
echo 📋 Contents included:
echo   - docker-compose.yml
echo   - Dockerfile
echo   - package.json
echo   - server.js
echo   - .dockerignore
echo   - database/init.sql
echo.
echo 🚀 Upload this ZIP file to Portainer using the "Upload" option
echo.
pause
