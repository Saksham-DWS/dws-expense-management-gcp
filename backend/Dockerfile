FROM node:20-alpine

# Copy the project (works whether build context is repo root or backend/)
WORKDIR /app/src
ENV NODE_ENV=production
COPY . .

# Resolve app dir (root if context=backend, else /backend)
RUN if [ -f /app/src/backend/package.json ]; then ln -s /app/src/backend /app/app; \
    elif [ -f /app/src/package.json ]; then ln -s /app/src /app/app; \
    else echo "package.json not found in build context" && ls -la /app/src && exit 1; fi

WORKDIR /app/app
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Ensure writable uploads directory for multer
RUN mkdir -p uploads && chown -R node:node /app/app/uploads
USER node

EXPOSE 5000
CMD ["node", "server.js"]
