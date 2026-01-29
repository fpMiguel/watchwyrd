# =============================================================================
# Watchwyrd - Docker Configuration
# =============================================================================
# Multi-stage build for optimal image size and security
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:22-alpine AS production

# Add labels for container metadata
LABEL org.opencontainers.image.source="https://github.com/fpMiguel/watchwyrd"
LABEL org.opencontainers.image.description="AI-powered movie & TV recommendations for Stremio"
LABEL org.opencontainers.image.licenses="MIT"

# Security: Run as non-root user
RUN addgroup -g 1001 -S watchwyrd && \
    adduser -S watchwyrd -u 1001 -G watchwyrd

WORKDIR /app

# Copy built assets and production dependencies
COPY --from=builder --chown=watchwyrd:watchwyrd /app/dist ./dist
COPY --from=builder --chown=watchwyrd:watchwyrd /app/node_modules ./node_modules
COPY --from=builder --chown=watchwyrd:watchwyrd /app/package.json ./

# Copy static assets
COPY --chown=watchwyrd:watchwyrd src/web/public ./dist/web/public

# Environment
ENV NODE_ENV=production
ENV PORT=7000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 7000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7000/health || exit 1

# Switch to non-root user
USER watchwyrd

# Start the application
CMD ["node", "dist/index.js"]
