# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage - Use Debian-based image for Prisma compatibility
FROM node:18-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install production dependencies and rebuild native modules for the target platform
RUN npm ci --only=production && npm rebuild argon2

EXPOSE 3000

CMD ["node", "dist/main"]