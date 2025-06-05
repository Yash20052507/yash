# supermodel-ai/backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies
# Copy package.json AND package-lock.json (if available)
COPY package*.json ./
# Using --legacy-peer-deps to avoid issues with some packages, adjust if not needed
RUN npm install --omit=dev --legacy-peer-deps

# Copy source code
# Copy the entire backend directory contents into the Docker image.
# Ensure .dockerignore is set up properly if needed to exclude node_modules from host, etc.
COPY . .

# Build TypeScript
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine

WORKDIR /usr/src/app

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built artifacts and production dependencies from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Copy .env.example; actual .env will be mounted or provided via docker-compose/secrets
COPY .env.example .

# Set ownership of app files to the non-root user
# This is important if any files need to be written at runtime by the app, though usually not for dist.
# For read-only, USER appuser before CMD is often enough.
# RUN chown -R appuser:appgroup /usr/src/app
# It's generally better to ensure the app doesn't need to write to its own directory.

# Switch to the non-root user
USER appuser

# Expose port - the PORT env var can be set by docker-compose, defaults to 5000
# This should match the port your application listens on (config.server.port)
EXPOSE ${PORT:-5000}

# Command to run the application
CMD ["node", "dist/index.js"]
