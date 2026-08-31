@echo off
REM Build script for portfolio application (Windows)
REM This script builds the application and creates a deployable package

setlocal enabledelayedexpansion

echo.
echo Building portfolio application...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
  echo Error: Node.js is not installed
  exit /b 1
)

REM Install dependencies
echo [*] Installing dependencies...
call npm ci
if errorlevel 1 (
  echo Error: Failed to install dependencies
  exit /b 1
)

REM Generate SSL certificates if needed
if not exist "server\certs\cert.pem" (
  echo [*] Generating SSL certificates...
  call npm run gen:certs
)

REM Build Docker image
where docker >nul 2>nul
if errorlevel 0 (
  echo [*] Building Docker image...
  for /f "tokens=*" %%i in ('node -p "require('./package.json').version"') do set VERSION=%%i
  for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set DATEVAR=%%c%%a%%b)
  for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set TIMEVAR=%%a%%b)
  set TIMESTAMP=!DATEVAR!_!TIMEVAR!
  set IMAGE_TAG=portfolio-app:!VERSION!_!TIMESTAMP!

  docker build -t "!IMAGE_TAG!" -t "portfolio-app:latest" .
  echo [OK] Docker image built: !IMAGE_TAG!
) else (
  echo [WARN] Docker not installed - skipping Docker build
)

REM Create deployment package
echo [*] Creating deployment package...
if not exist "build\portfolio" mkdir "build\portfolio"

REM Copy production files
xcopy /E /I /Y server build\portfolio\server
xcopy /E /I /Y assets build\portfolio\assets
copy index.html build\portfolio\
copy package*.json build\portfolio\
copy .env.example build\portfolio\
copy Dockerfile build\portfolio\
copy docker-compose.yml build\portfolio\
copy railway.json build\portfolio\
copy render.yaml build\portfolio\
copy README.md build\portfolio\

REM Create zip archive
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set DATEVAR=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set TIMEVAR=%%a%%b)
set ARCHIVE_NAME=portfolio-!DATEVAR!_!TIMEVAR!.zip

powershell -NoProfile -Command "Compress-Archive -Path 'build\portfolio' -DestinationPath '%ARCHIVE_NAME%' -Force"

echo [OK] Deployment package created: %ARCHIVE_NAME%
echo.
echo [INFO] Next steps:
echo   1. For Docker deployment: docker-compose up -d
echo   2. For Railway: railway up
echo   3. For Render: Connect your GitHub repo to Render
echo   4. For Azure App Service: Deploy the %ARCHIVE_NAME%
echo.
echo [OK] Build complete!
echo.
