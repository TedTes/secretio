FROM node:18-alpine

WORKDIR /app

# Copy vault-api
COPY packages/vault-api ./

# Copy shared files into vault-api
COPY packages/shared/src ./src/shared

# Update tsconfig.json to include the shared files and remove rootDir restriction
RUN sed -i 's|"rootDir": "./src"|"rootDir": "./"|g' tsconfig.json
RUN sed -i 's|"include": \["src/\*\*/\*"|"include": ["src/**/*", "src/shared/**/*"|g' tsconfig.json

# Update imports 
RUN find src -name "*.ts" -type f -not -path "src/shared/*" -exec sed -i "s|from '@secretio/shared'|from './shared'|g" {} \;

# Remove the shared dependency from package.json
RUN sed -i '/"@secretio\/shared":/d' package.json

# Install and build
RUN npm install
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]