# Development Stage (for local hot reload)
FROM node:20-alpine AS development
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Expose port
EXPOSE 3000

# Run in development mode with hot reload
CMD ["npm", "run", "start:dev"]

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the NestJS app
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy package files
COPY --from=builder /app/package*.json ./

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy node_modules from builder (includes all dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Set correct permissions
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

# Start the NestJS app
CMD ["node", "dist/main"]
