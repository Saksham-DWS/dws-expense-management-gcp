FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set base environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV ENABLE_IN_APP_CRON=false
ENV CRON_TIMEZONE=UTC

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Ensure writable uploads directory (Cloud Run uses ephemeral FS)
RUN mkdir -p /app/uploads \
    && chown -R node:node /app

# Use non-root user for security
USER node

# Expose Cloud Run port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
