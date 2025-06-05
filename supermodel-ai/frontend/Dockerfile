# supermodel-ai/frontend/Dockerfile

# --- Build Stage ---
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
# Using --legacy-peer-deps to avoid issues with some packages, adjust if not needed
RUN npm install --legacy-peer-deps

COPY . .

# Environment variables for the build stage can be set here if needed
# Example: ARG REACT_APP_API_URL_BUILD=/api
# ENV REACT_APP_API_URL=$REACT_APP_API_URL_BUILD
# These would be passed during `docker build` if they are static for the build.
# For dynamic URLs at runtime, Nginx proxy is the better approach (already planned).

RUN npm run build

# --- Production Stage ---
FROM nginx:1.25-alpine

# Copy built static files from builder stage to Nginx html directory
COPY --from=builder /usr/src/app/build /usr/share/nginx/html

# Copy custom Nginx configuration
# This nginx.conf will be created in the project and copied here.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port for Nginx (default is 80)
EXPOSE 80

# Nginx default command runs in foreground, which is good for Docker
# CMD ["nginx", "-g", "daemon off;"] is the default CMD for the nginx image, so not strictly necessary to repeat.
