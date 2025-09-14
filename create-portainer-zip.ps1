# PowerShell script to create Portainer deployment ZIP
Write-Host "Creating Portainer deployment ZIP file..." -ForegroundColor Green

# Create temporary directory
$tempDir = "portainer-deploy"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null
New-Item -ItemType Directory -Path "$tempDir\database" | Out-Null

# Copy necessary files
$filesToCopy = @(
    @{Source = "docker-compose.yml"; Dest = "$tempDir\docker-compose.yml"},
    @{Source = "package.json"; Dest = "$tempDir\package.json"},
    @{Source = "server.js"; Dest = "$tempDir\server.js"},
    @{Source = "Dockerfile"; Dest = "$tempDir\Dockerfile"},
    @{Source = ".dockerignore"; Dest = "$tempDir\.dockerignore"},
    @{Source = "database\init.sql"; Dest = "$tempDir\database\init.sql"}
)

foreach ($file in $filesToCopy) {
    if (Test-Path $file.Source) {
        Copy-Item $file.Source $file.Dest
        Write-Host "Copied $($file.Source)" -ForegroundColor Gray
    } else {
        Write-Host "Warning: $($file.Source) not found" -ForegroundColor Yellow
    }
}

# Create ZIP file
$zipPath = "recipe-api-portainer.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Clean up
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "ZIP file created: $zipPath" -ForegroundColor Green
Write-Host ""
Write-Host "Contents included:" -ForegroundColor Cyan
Write-Host "  - docker-compose.yml"
Write-Host "  - Dockerfile"
Write-Host "  - package.json"
Write-Host "  - server.js"
Write-Host "  - .dockerignore"
Write-Host "  - database/init.sql"
Write-Host ""
Write-Host "Upload this ZIP file to Portainer using the Upload option" -ForegroundColor Yellow
Write-Host ""

# Show file size
$zipSize = (Get-Item $zipPath).Length
$zipSizeKB = [math]::Round($zipSize/1KB, 2)
Write-Host "ZIP file size: $zipSizeKB KB" -ForegroundColor Gray
