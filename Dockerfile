# Stage 1: Build Phase
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy full source and build assets (compiles React bundle via Vite and Express server via esbuild)
COPY . .
RUN npm run build

# Stage 2: Production Execution Phase
FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package descriptors and only install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built server and web client resources from compile stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose server entry port
EXPOSE 3000

# Run containerized service
CMD ["node", "dist/server.cjs"]
