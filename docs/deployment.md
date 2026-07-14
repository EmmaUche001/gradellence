# Gradellence SRMS — Deployment Guide

## Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis (optional, for caching)
- PM2 or Docker

## Environment Variables

### Server (`server/.env`)
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/gradellence"

# Auth
JWT_SECRET="your-secret-key"
JWT_EXPIRY="7d"

# App
NODE_ENV="production"
PORT="3000"
FRONTEND_URL="https://app.gradellence.com"

# Billing
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_WEBHOOK_SECRET="..."

# Email (optional)
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."

# Storage
STORAGE_PROVIDER="local" # or "s3"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="gradellence-uploads"
```

### Client (`client/.env`)
```env
VITE_API_URL="https://api.gradellence.com/api/v1"
```

## Local Development

```bash
# 1. Clone repo
git clone https://github.com/EmmaUche001/gradellence.git
cd gradellence

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Database setup
cd server
npx prisma migrate dev
npx prisma generate
npx prisma db seed

# 4. Start dev servers
# Terminal 1: Server
cd server && npm run start:dev

# Terminal 2: Client
cd client && npm run dev
```

## Production Deployment

### Option 1: PM2

```bash
# Build
cd server && npm run build
cd ../client && npm run build

# Start with PM2
pm2 start dist/main.js --name gradellence-api
pm2 save
pm2 startup
```

### Option 2: Docker

```bash
docker-compose up -d
```

### Option 3: Kubernetes

```bash
kubectl apply -f k8s/
```

## Database Migrations

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

## Health Check

```bash
curl https://api.gradellence.com/api/v1/health
```

## Troubleshooting

### Port Already in Use
```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check firewall rules

### CORS Errors
- Verify `FRONTEND_URL` matches actual frontend domain
- Check Vite proxy config in `client/vite.config.ts`