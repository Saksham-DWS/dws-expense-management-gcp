# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time API URL for Vite (must be provided during build)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build frontend
COPY . .
RUN npm run build


# ---------- Runtime stage ----------
FROM nginx:1.27-alpine

# Cloud Run requires listening on port 8080
WORKDIR /usr/share/nginx/html

# Replace default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist ./

EXPOSE 8080

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
