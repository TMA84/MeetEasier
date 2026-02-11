# Build stage - includes all dev dependencies and build tools
FROM node:current-alpine3.23 AS builder

# Update packages and install security updates
RUN apk update && apk upgrade

WORKDIR /opt/meeteasier

# Copy package files first for better caching
COPY package*.json ./
COPY ui-react/package*.json ./ui-react/

# Install all dependencies (including devDependencies needed for build)
RUN npm install --ignore-scripts && \
    cd ui-react && npm install

# Copy source code
COPY . .

# Build SCSS (use npx to run sass from node_modules)
RUN npx sass scss/compiled.scss static/css/styles.css

# Build React application with Vite (outputs to ui-react/build/)
RUN cd ui-react && npm run build

# Verify build output exists
RUN ls -la ui-react/build/

# Production stage - only runtime dependencies and built files
FROM node:25-alpine

# Update packages and install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /opt/meeteasier

# Copy package files for production dependencies only
COPY package*.json ./

# Install ONLY production dependencies (no devDependencies)
RUN npm install --omit=dev --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /root/.npm

# Copy built files from builder stage
COPY --from=builder /opt/meeteasier/ui-react/build ./ui-react/build
COPY --from=builder /opt/meeteasier/static ./static

# Copy application source (excluding node_modules and ui-react source)
COPY app ./app
COPY config ./config
COPY data ./data
COPY server.js ./
COPY .env.template .env

# Set NODE_ENV to production
ENV NODE_ENV=production

# Remove npm and its dependencies after installation to reduce CVEs
# We don't need npm at runtime, only node
RUN rm -rf /usr/local/lib/node_modules/npm && \
    rm -rf /usr/local/bin/npm /usr/local/bin/npx && \
    find /usr/local/lib/node_modules -type d -name ".bin" -exec rm -rf {} + 2>/dev/null || true

# Change ownership and switch to non-root user
RUN chown -R nodejs:nodejs /opt/meeteasier
USER nodejs

EXPOSE 8080

# OAuth credentials and other sensitive data should be provided at runtime
# Example:
# docker run -e OAUTH_CLIENT_ID=xxx -e OAUTH_AUTHORITY=xxx -e OAUTH_CLIENT_SECRET=xxx ...
CMD [ "node", "server.js" ]
