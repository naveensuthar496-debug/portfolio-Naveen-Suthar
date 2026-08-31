# Deployment Guide

This guide explains how to build and deploy the portfolio application with HTTPS/SSL support and Azure SQL Database integration.

## Table of Contents

1. [Local Development](#local-development)
2. [Building the Application](#building-the-application)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [SSL/HTTPS Configuration](#ssltls-configuration)
6. [Database Configuration](#database-configuration)

---

## Local Development

### Prerequisites

- Node.js 18+ (check with `node --version`)
- npm or yarn
- OpenSSL (for generating SSL certificates)

### Setup

```bash
# Install dependencies
npm install

# Generate SSL certificates (one-time)
npm run gen:certs

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# - Set MONGODB_URI or Azure SQL credentials
# - Set SMTP credentials for email
# - Set USE_HTTPS=true if testing HTTPS locally

# Start development server
npm run dev

# Server will run at:
# - HTTP:  http://localhost:3000
# - HTTPS: https://localhost:3000 (if certificates exist and USE_HTTPS=true)
```

### Testing the Application

```bash
# Check mail configuration
npm run check:mail

# Check database connection
npm run check:db

# List stored enquiries
npm run list
```

---

## Building the Application

### Using Build Scripts

**On Windows:**
```bash
.\build.bat
```

**On macOS/Linux:**
```bash
chmod +x build.sh
./build.sh
```

This will:
1. Install dependencies
2. Generate SSL certificates
3. Build a Docker image
4. Create a deployable ZIP archive

### Manual Build

```bash
# Install dependencies
npm ci

# Generate SSL certificates (if needed)
npm run gen:certs

# Build Docker image
docker build -t portfolio-app:latest .

# Create deployment archive
zip -r portfolio-deployment.zip server/ assets/ index.html package*.json Dockerfile .env.example README.md
```

---

## Docker Deployment

### Local Docker Development

```bash
# Build image
docker build -t portfolio-app:latest .

# Run container
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb://mongo:27017/portfolio" \
  -e SMTP_USER="your@email.com" \
  -e SMTP_PASS="your-app-password" \
  portfolio-app:latest
```

### Docker Compose (Recommended for Local Development)

```bash
# Start all services (app + MongoDB)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

**Environment Variables in docker-compose.yml:**
- `NODE_ENV`: development or production
- `DATABASE_TYPE`: mongodb or mssql
- `MONGODB_URI`: MongoDB connection string
- Or Azure SQL credentials (AZURE_SQL_SERVER, AZURE_SQL_DATABASE, etc.)

---

## Cloud Deployment

### Option 1: Railway

Railway provides easy Node.js deployment with automatic builds from GitHub.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set DATABASE_TYPE=mssql
railway variables set AZURE_SQL_SERVER=your-server.database.windows.net
railway variables set AZURE_SQL_DATABASE=portfolio
railway variables set AZURE_SQL_USER=youradmin
railway variables set AZURE_SQL_PASSWORD=your-password
railway variables set USE_HTTPS=true

# Deploy
railway up
```

**Configuration File:** `railway.json` (auto-created)

### Option 2: Render

Render has first-class support for Docker deployments.

1. Connect your GitHub repository to Render
2. Render will detect `Dockerfile` and `render.yaml`
3. Set environment variables in Render dashboard:
   - `NODE_ENV`: production
   - `DATABASE_TYPE`: mssql
   - Azure SQL credentials
   - `USE_HTTPS`: true
4. Render will automatically deploy on git push

**Configuration File:** `render.yaml`

### Option 3: Azure App Service

Deploy to Azure App Service with continuous deployment from GitHub.

```bash
# Create resource group
az group create --name portfolio-rg --location eastus

# Create App Service plan
az appservice plan create --name portfolio-plan --resource-group portfolio-rg --sku B1 --is-linux

# Create web app
az webapp create --resource-group portfolio-rg --plan portfolio-plan --name portfolio-app --runtime "node|18-lts"

# Configure deployment from GitHub
az webapp deployment github-actions add --repo-url https://github.com/yourusername/portfolio --branch main --resource-group portfolio-rg --name portfolio-app

# Set environment variables
az webapp config appsettings set --resource-group portfolio-rg --name portfolio-app --settings \
  NODE_ENV=production \
  DATABASE_TYPE=mssql \
  AZURE_SQL_SERVER=your-server.database.windows.net \
  AZURE_SQL_DATABASE=portfolio \
  AZURE_SQL_USER=youradmin \
  AZURE_SQL_PASSWORD=your-password \
  USE_HTTPS=true
```

### Option 4: Heroku (Legacy - Git Push Deploy)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create portfolio-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DATABASE_TYPE=mssql
heroku config:set AZURE_SQL_SERVER=your-server.database.windows.net
heroku config:set USE_HTTPS=true

# Deploy
git push heroku main
```

---

## SSL/TLS Configuration

### Development (Self-Signed Certificates)

```bash
# Generate self-signed certificates valid for 365 days
npm run gen:certs

# This creates:
# - server/certs/cert.pem
# - server/certs/key.pem

# Enable HTTPS
echo "USE_HTTPS=true" >> .env
npm run dev

# Access via https://localhost:3000
# Note: Browser will show SSL warning (expected for self-signed certs)
```

### Production (Let's Encrypt)

For production, use Let's Encrypt to obtain free SSL certificates:

```bash
# Install Certbot
# macOS: brew install certbot
# Ubuntu: sudo apt-get install certbot

# Generate certificate
certbot certonly --standalone -d yourdomain.com

# Copy certificates to app
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem server/certs/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem server/certs/key.pem

# Set environment variables
export SSL_CERT_PATH="/app/server/certs/cert.pem"
export SSL_KEY_PATH="/app/server/certs/key.pem"
export USE_HTTPS=true

# Start application
npm start
```

### Docker with SSL

For Docker deployments, mount certificate volumes:

```bash
docker run -p 443:3000 \
  -v /path/to/cert.pem:/app/server/certs/cert.pem:ro \
  -v /path/to/key.pem:/app/server/certs/key.pem:ro \
  -e USE_HTTPS=true \
  -e SSL_CERT_PATH=/app/server/certs/cert.pem \
  -e SSL_KEY_PATH=/app/server/certs/key.pem \
  portfolio-app:latest
```

---

## Database Configuration

### MongoDB (Default)

```bash
# Set in .env
DATABASE_TYPE=mongodb
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=portfolio

# Or local MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017
```

### Azure SQL Database

```bash
# Set in .env
DATABASE_TYPE=mssql
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=portfolio
AZURE_SQL_USER=youradmin
AZURE_SQL_PASSWORD=YourSecurePassword123!
AZURE_SQL_PORT=1433

# The app will automatically create the required tables on first connection
```

#### Creating an Azure SQL Database

```bash
# Create resource group
az group create --name portfolio-rg --location eastus

# Create SQL Server
az sql server create --name portfolio-server --resource-group portfolio-rg --admin-user youradmin --admin-password YourSecurePassword123!

# Create database
az sql db create --resource-group portfolio-rg --server portfolio-server --name portfolio --edition Basic

# Configure firewall (allow Azure services)
az sql server firewall-rule create --resource-group portfolio-rg --server portfolio-server --name allow-azure --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0

# Get connection string
az sql db show-connection-string --server portfolio-server --name portfolio --client sqlcmd
```

#### Migrating from MongoDB to Azure SQL

1. Export MongoDB data as JSON
2. Import into Azure SQL using the provided Enquiry schema
3. Update `.env` to use Azure SQL
4. Restart the application

---

## Health Checks

The application provides a health endpoint for monitoring:

```bash
# Check application health
curl https://localhost:3000/api/health

# Response includes:
# {
#   "ok": true,
#   "uptime": 1234,
#   "db": {
#     "type": "Azure SQL",
#     "configured": true,
#     "connected": true
#   },
#   "mail": { "configured": true, "to": "..." },
#   "budgets": [...]
# }
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | development or production |
| `USE_HTTPS` | false | Enable HTTPS |
| `SSL_CERT_PATH` | server/certs/cert.pem | Path to SSL certificate |
| `SSL_KEY_PATH` | server/certs/key.pem | Path to SSL private key |
| `DATABASE_TYPE` | mongodb | mongodb or mssql |
| `MONGODB_URI` | | MongoDB connection string |
| `MONGODB_DB` | portfolio | MongoDB database name |
| `AZURE_SQL_SERVER` | | Azure SQL server |
| `AZURE_SQL_DATABASE` | | Azure SQL database |
| `AZURE_SQL_USER` | | Azure SQL username |
| `AZURE_SQL_PASSWORD` | | Azure SQL password |
| `AZURE_SQL_PORT` | 1433 | Azure SQL port |
| `MAIL_TO` | | Recipient email for enquiries |
| `SMTP_USER` | | SMTP username |
| `SMTP_PASS` | | SMTP password |
| `MAIL_SERVICE` | gmail | gmail or custom |

---

## Troubleshooting

### SSL Certificate Issues

```bash
# Regenerate certificates
npm run gen:certs

# Check certificate validity
openssl x509 -in server/certs/cert.pem -text -noout
```

### Database Connection Issues

```bash
# Test MongoDB connection
npm run check:db

# Test SMTP connection
npm run check:mail
```

### Docker Build Issues

```bash
# Clear Docker cache and rebuild
docker build --no-cache -t portfolio-app:latest .

# View build logs
docker build -t portfolio-app:latest --progress=plain .
```

---

## Security Recommendations

1. **Always use HTTPS in production** - Set `USE_HTTPS=true` and provide valid SSL certificates
2. **Secure database credentials** - Use environment variables, never commit `.env`
3. **Rate limiting** - Already configured for `/api/contact` endpoint
4. **CORS** - Consider adding CORS middleware if serving from different domain
5. **CSP headers** - Add Content Security Policy headers for XSS protection
6. **Regular updates** - Keep dependencies updated with `npm audit fix`

---

## Support

For issues or questions:
1. Check `.env.example` for all available configuration options
2. Review application logs for error messages
3. Test database connection with `npm run check:db`
4. Test email configuration with `npm run check:mail`
