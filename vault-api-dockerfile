# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy shared package first
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm install && npm run build

# Copy vault-api package
WORKDIR /app
COPY packages/vault-api ./packages/vault-api
WORKDIR /app/packages/vault-api

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy built vault-api
COPY --from=builder /app/packages/vault-api/dist ./dist
COPY --from=builder /app/packages/vault-api/package.json ./package.json
COPY --from=builder /app/packages/vault-api/node_modules ./node_modules

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]