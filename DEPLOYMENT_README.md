# Portfolio Application - Deployment Ready

A production-ready Node.js portfolio application with HTTPS/SSL support and Azure SQL Database integration.

## ✨ Features

- **HTTPS/SSL Security** - Built-in support for self-signed (dev) and production SSL certificates
- **Dual Database Support** - MongoDB (default) or Azure SQL Database
- **Email Notifications** - SMTP integration for project enquiries
- **Rate Limiting** - Abuse protection on contact endpoint
- **Docker Ready** - Dockerfile and docker-compose included
- **Cloud Ready** - Deployment configs for Railway, Render, Azure App Service
- **Health Checks** - Built-in `/api/health` endpoint
- **Graceful Degradation** - Fallback file storage if database unavailable
- **Production Optimized** - Environment-based configuration, proper logging

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Generate SSL certificates
npm run gen:certs

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev

# Server runs at http://localhost:3000 (or https if USE_HTTPS=true)
```

### Docker (Recommended)

```bash
# Start app with MongoDB using docker-compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## 🔐 HTTPS/SSL Configuration

### Development (Self-Signed)

```bash
npm run gen:certs
echo "USE_HTTPS=true" >> .env
npm run dev
# Access: https://localhost:3000
```

### Production (Let's Encrypt)

```bash
# Obtain certificates from Let's Encrypt
certbot certonly --standalone -d yourdomain.com

# Set environment variables
export SSL_CERT_PATH="/path/to/fullchain.pem"
export SSL_KEY_PATH="/path/to/privkey.pem"
export USE_HTTPS=true

npm start
```

## 🗄️ Database Configuration

### MongoDB (Default)

```env
DATABASE_TYPE=mongodb
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=portfolio
```

### Azure SQL Database

```env
DATABASE_TYPE=mssql
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=portfolio
AZURE_SQL_USER=youradmin
AZURE_SQL_PASSWORD=YourSecurePassword123!
```

The app automatically creates required tables on first connection.

## ☁️ Cloud Deployment

### Railway
```bash
railway init
railway variables set AZURE_SQL_SERVER=...
railway up
```

### Render
1. Connect GitHub repository to Render
2. Set environment variables in dashboard
3. Render auto-deploys on git push

### Azure App Service
```bash
az webapp create --resource-group mygroup --plan myplan --name myapp --runtime "node|18-lts"
az webapp config appsettings set --resource-group mygroup --name myapp --settings KEY=value
```

### Docker
```bash
docker build -t portfolio-app:latest .
docker run -p 3000:3000 -e DATABASE_TYPE=mssql -e AZURE_SQL_SERVER=... portfolio-app:latest
```

## 📋 Build & Package

### Automated Build

**Windows:**
```bash
.\build.bat
```

**Linux/macOS:**
```bash
chmod +x build.sh
./build.sh
```

Creates:
- Docker image
- Deployment ZIP package

### Manual Build

```bash
npm run build:docker
zip -r deployment.zip server/ assets/ index.html package*.json
```

## 📊 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `USE_HTTPS` | false | Enable HTTPS |
| `DATABASE_TYPE` | mongodb | mongodb or mssql |
| `MONGODB_URI` | | MongoDB connection string |
| `AZURE_SQL_SERVER` | | Azure SQL hostname |
| `AZURE_SQL_DATABASE` | | Database name |
| `AZURE_SQL_USER` | | SQL username |
| `AZURE_SQL_PASSWORD` | | SQL password |
| `MAIL_TO` | | Enquiry recipient email |
| `SMTP_USER` | | Email address |
| `SMTP_PASS` | | Email app password |
| `MAIL_SERVICE` | gmail | SMTP service (gmail/custom) |

See `.env.example` for complete list.

## 🔍 Health Checks

```bash
# Check application status
curl https://localhost:3000/api/health

# Response:
# {
#   "ok": true,
#   "uptime": 1234,
#   "db": {
#     "type": "Azure SQL",
#     "configured": true,
#     "connected": true
#   },
#   "mail": { "configured": true, "to": "..." }
# }
```

## 🧪 Testing

```bash
# Test mail configuration
npm run check:mail

# Test database connection
npm run check:db

# List stored enquiries
npm run list
```

## 📦 Scripts

```bash
npm start              # Start production server
npm run dev            # Start with file watcher
npm run build          # Build and create packages
npm run gen:certs      # Generate SSL certificates
npm run check:mail     # Test SMTP configuration
npm run check:db       # Test database connection
npm run list           # List enquiries
npm run docker:up      # Start docker-compose
npm run docker:down    # Stop docker-compose
npm run docker:logs    # View docker logs
```

## 🔒 Security Features

- ✅ HTTPS/SSL encryption
- ✅ Rate limiting on `/api/contact` (5 requests per 15 minutes)
- ✅ Input validation and sanitization
- ✅ Spam detection
- ✅ Environment variable configuration (never commit `.env`)
- ✅ Graceful error handling
- ✅ CORS and security headers ready

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Comprehensive deployment guide
- **[.env.example](./.env.example)** - Configuration template
- **[Dockerfile](./Dockerfile)** - Docker build configuration
- **[railway.json](./railway.json)** - Railway deployment config
- **[render.yaml](./render.yaml)** - Render deployment config

## 🐛 Troubleshooting

### SSL Certificate Issues
```bash
npm run gen:certs  # Regenerate certificates
```

### Database Connection Issues
```bash
npm run check:db   # Test database connection
```

### Email Configuration Issues
```bash
npm run check:mail # Test SMTP connection
```

### Docker Issues
```bash
docker build --no-cache -t portfolio-app:latest .  # Clear cache and rebuild
docker-compose logs -f app  # View application logs
```

## 📞 Support

Check logs and health endpoint for diagnostics:
```bash
# View application logs
npm run docker:logs

# Check health status
curl https://localhost:3000/api/health
```

## 📝 License

See LICENSE file for details.

## 🎯 Next Steps

1. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Set database credentials (MongoDB or Azure SQL)
   - Set email credentials

2. **Generate SSL Certificates**
   - Run `npm run gen:certs` for development
   - Obtain production certificates from Let's Encrypt

3. **Test Locally**
   - Run `npm run dev` for development
   - Or `docker-compose up -d` for Docker

4. **Deploy to Cloud**
   - Choose deployment platform (Railway, Render, Azure App Service)
   - Configure environment variables
   - Deploy and verify with `/api/health` endpoint

5. **Monitor Production**
   - Set up log aggregation
   - Monitor health endpoint
   - Set up alerts for errors

---

**Ready to deploy!** 🚀
