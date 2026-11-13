# Multi-stage Dockerfile for Aureum Unified Deployment (100% Supabase)
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

# Build frontend and backend
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

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

# Launch server
CMD ["node", "backend/dist/index.js"]
