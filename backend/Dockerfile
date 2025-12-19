FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV ENABLE_IN_APP_CRON=false
ENV CRON_TIMEZONE=UTC

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ensure writable uploads directory for multer (Cloud Run uses ephemeral storage)
RUN mkdir -p uploads && chown -R node:node /app/uploads
USER node

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
