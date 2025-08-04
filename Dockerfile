FROM node:18-alpine

WORKDIR /app

# Create the exact monorepo structure
COPY packages/shared ./packages/shared
COPY packages/vault-api ./packages/vault-api

# First, build the shared package
WORKDIR /app/packages/shared
RUN npm install
RUN npm run build

# Now build vault-api with the shared dependency
WORKDIR /app/packages/vault-api

# Install dependencies (this will create the symlink to ../shared)
RUN npm install

# Verify the shared package is properly linked
RUN ls -la node_modules/@secretio/
RUN ls -la ../shared/dist/

# Build vault-api
RUN npm run build

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]