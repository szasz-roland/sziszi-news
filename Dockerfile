# Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install minimal runtime helpers
RUN apk add --no-cache \
  tini \
  su-exec \
  && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p data uploads/images uploads/videos uploads/docs

# Copy init script
COPY init.sh /app/init.sh
RUN chmod +x /app/init.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini and bootstrap script to fix permissions before dropping privileges
ENTRYPOINT ["/sbin/tini", "--", "/app/init.sh"]