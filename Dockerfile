# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root tsconfig.json if it exists (needed by all packages)
COPY tsconfig.json* ./

# Copy shared package first
COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm install && npm run build

# Copy vault-api package
WORKDIR /app
COPY packages/vault-api ./packages/vault-api
WORKDIR /app/packages/vault-api

# Install dependencies (this will link the shared package via file: dependency)
RUN npm install

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy the entire built structure to maintain proper linking
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/vault-api/dist ./dist
COPY --from=builder /app/packages/vault-api/package.json ./package.json
COPY --from=builder /app/packages/vault-api/node_modules ./node_modules

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]