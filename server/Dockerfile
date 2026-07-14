# Build stage - Alpine
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 600000

RUN npm ci || npm ci || npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage - same Alpine base
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install ONLY production deps fresh — no native binary mismatch
RUN npm ci --omit=dev || npm ci --omit=dev || npm ci --omit=dev

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/src/main"]