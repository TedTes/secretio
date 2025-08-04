FROM node:18-alpine

WORKDIR /app

# Copy root tsconfig.json (needed by packages that extend it)
COPY tsconfig.json ./tsconfig.json

# Create the exact monorepo structure
COPY packages/shared ./packages/shared
COPY packages/vault-api ./packages/vault-api

# First, build the shared package
WORKDIR /app/packages/shared
RUN npm install
RUN npm run build

# Now build vault-api with the shared dependency
WORKDIR /app/packages/vault-api

# Install dependencies first
RUN npm install

# Manually create the @secretio namespace and symlink
RUN mkdir -p node_modules/@secretio
RUN ln -sf /app/packages/shared node_modules/@secretio/shared

# Verify the symlink was created and shared package is built
RUN ls -la node_modules/@secretio/
RUN ls -la node_modules/@secretio/shared/dist/

# Build vault-api
RUN npm run build

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]