# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache python3 make g++

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/vault-api/package*.json ./packages/vault-api/
COPY packages/vault-api/tsconfig.json ./packages/vault-api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/

# Install dependencies for each package separately (including dev deps for building)
# First install shared package dependencies
WORKDIR /app/packages/shared
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm cache clean --force

# Install vault-api dependencies
WORKDIR /app/packages/vault-api
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm cache clean --force

# Copy shared package source and build it
WORKDIR /app
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm run build

# Copy vault-api source  
WORKDIR /app
COPY packages/vault-api ./packages/vault-api

# Create a symlink for the shared package so vault-api can find it
WORKDIR /app/packages/vault-api
RUN mkdir -p node_modules/@secretio && \
    ln -sf ../../shared node_modules/@secretio/shared

# Build vault-api
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vault-api -u 1001

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY --from=builder /app/packages/vault-api/package*.json ./packages/vault-api/
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/

# Copy built shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Install only production dependencies for vault-api
WORKDIR /app/packages/vault-api
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# Copy built vault-api application
COPY --from=builder /app/packages/vault-api/dist ./dist

# Copy any additional runtime files if needed
COPY --from=builder /app/packages/vault-api/package.json ./

# Change ownership to app user
RUN chown -R vault-api:nodejs /app

# Switch to non-root user
USER vault-api

# Expose the port (Railway will override this)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
  const options = { host: 'localhost', port: process.env.PORT || 3001, path: '/health', timeout: 2000 }; \
  const req = http.request(options, (res) => { \
    if (res.statusCode === 200) process.exit(0); \
    else process.exit(1); \
  }); \
  req.on('error', () => process.exit(1)); \
  req.end();"

# Set environment variables for production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]