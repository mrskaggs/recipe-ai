@echo off
echo Creating CLEAN Portainer deployment ZIP file...

REM Create a temporary directory for the zip contents
if exist portainer-clean rmdir /s /q portainer-clean
mkdir portainer-clean
mkdir portainer-clean\database

REM Copy necessary files using the CLEAN docker-compose file
copy docker-compose-clean.yml portainer-clean\docker-compose.yml
copy package.json portainer-clean\
copy server.js portainer-clean\
copy Dockerfile portainer-clean\
copy .dockerignore portainer-clean\
copy database\init.sql portainer-clean\database\

REM Create the ZIP file (requires PowerShell)
powershell -command "Compress-Archive -Path 'portainer-clean\*' -DestinationPath 'recipe-api-clean.zip' -Force"

REM Clean up temporary directory
rmdir /s /q portainer-clean

echo.
echo ZIP file created: recipe-api-clean.zip
echo.
echo Contents included:
echo   - docker-compose.yml (CLEAN VERSION)
echo   - Dockerfile
echo   - package.json
echo   - server.js
echo   - .dockerignore
echo   - database/init.sql
echo.
echo Upload this ZIP file to Portainer using the Upload option
echo.
pause
