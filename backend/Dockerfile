# Dockerfile for InvestGhanaHub Backend
FROM node:18-alpine AS build

RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (include dev deps for TypeScript build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies for smaller runtime image
RUN npm prune --omit=dev

FROM node:18-alpine

RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy built artifacts + production deps
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 5000

# Start the application (apply migrations first)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

