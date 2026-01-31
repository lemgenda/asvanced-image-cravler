FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy application files
COPY backend/ ./
COPY frontend/ ../frontend/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app

USER nextjs

# Create necessary directories
RUN mkdir -p /app/temp

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]