FROM node:18-alpine

WORKDIR /app

# Copy vault-api
COPY packages/vault-api ./

# Copy shared files into vault-api
COPY packages/shared/src ./src/shared

# Create a standalone tsconfig.json that doesn't extend anything
RUN cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "types": ["node"],
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Update all imports to use relative paths
RUN find src -name "*.ts" -type f -not -path "src/shared/*" -exec sed -i "s|from '@secretio/shared'|from './shared'|g" {} \;

# Remove the shared dependency from package.json
RUN sed -i '/"@secretio\/shared":/d' package.json

# Debug: Show the file structure and a sample import
RUN echo "=== File structure ===" && ls -la src/
RUN echo "=== Shared files ===" && ls -la src/shared/ || echo "No shared directory"
RUN echo "=== Sample imports ===" && head -5 src/types/api.ts || echo "File not found"

# Install and build
RUN npm install
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]