# Multi-stage Dockerfile for Aureum Unified Deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm --prefix backend ci
RUN npm --prefix frontend ci

# Copy full source
COPY . .

# Generate Prisma client and build frontend and backend
RUN npx --prefix backend prisma generate
RUN npm --prefix frontend run build
RUN npm --prefix backend run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy root package
COPY package.json ./

# Copy backend dependencies and compiled files
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

# Run prisma migration/push on start and launch server
CMD ["sh", "-c", "npx --prefix backend prisma db push && node backend/dist/index.js"]
