#!/bin/bash
# Build script for portfolio application
# This script builds the application and creates a deployable package

set -e

echo "🔨 Building portfolio application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate SSL certificates if needed
if [ ! -f "server/certs/cert.pem" ] || [ ! -f "server/certs/key.pem" ]; then
  echo "🔐 Generating SSL certificates..."
  npm run gen:certs
fi

# Build Docker image
if command -v docker &> /dev/null; then
  echo "🐳 Building Docker image..."
  VERSION=$(node -p "require('./package.json').version")
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  IMAGE_TAG="portfolio-app:${VERSION}_${TIMESTAMP}"

  docker build -t "$IMAGE_TAG" -t "portfolio-app:latest" .
  echo "✅ Docker image built: $IMAGE_TAG"
else
  echo "⚠️  Docker not installed - skipping Docker build"
fi

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p build/portfolio

# Copy production files
cp -r server build/portfolio/
cp -r assets build/portfolio/
cp index.html build/portfolio/
cp package*.json build/portfolio/
cp .env.example build/portfolio/
cp Dockerfile build/portfolio/
cp docker-compose.yml build/portfolio/
cp railway.json build/portfolio/
cp render.yaml build/portfolio/
cp README.md build/portfolio/

# Create zip archive
ARCHIVE_NAME="portfolio-$(date +%Y%m%d_%H%M%S).zip"
cd build
zip -r "../${ARCHIVE_NAME}" portfolio/
cd ..

echo "✅ Deployment package created: ${ARCHIVE_NAME}"
echo ""
echo "📋 Next steps:"
echo "   1. For Docker deployment: docker-compose up -d"
echo "   2. For Railway: railway up"
echo "   3. For Render: Connect your GitHub repo to Render"
echo "   4. For Azure App Service: Deploy the ${ARCHIVE_NAME}"
echo ""
echo "🚀 Build complete!"
