FROM node:20-alpine

# Note: OAuth credentials should be provided at runtime via environment variables
# for security. Build-time args are only used as placeholders for the build process.
ENV NODE_ENV=production

# Update packages and install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /opt/meeteasier

# Copy package files first for better caching
COPY package*.json ./
COPY ui-react/package*.json ./ui-react/

# Install all dependencies (including devDependencies needed for build)
# Root dependencies (excluding postinstall that would try to install ui-react)
RUN npm install --ignore-scripts

# Install ui-react dependencies including devDependencies (needed for vite build)
RUN cd ui-react && NODE_ENV=development npm install

# Copy source code
COPY . .
COPY .env.template .env

# Build SCSS first (use npx to run sass from node_modules)
RUN npx sass scss/compiled.scss static/css/styles.css

# Build React application with Vite (outputs to ui-react/build/)
RUN cd ui-react && npm run build

# Verify build output exists
RUN ls -la ui-react/build/

# Now remove dev dependencies and npm to reduce CVEs
RUN npm prune --omit=dev && \
    cd ui-react && npm prune --omit=dev && \
    npm cache clean --force

# Remove npm binaries after build is complete
RUN rm -rf /usr/local/lib/node_modules/npm && \
    rm -rf /usr/local/bin/npm /usr/local/bin/npx && \
    rm -rf ~/.npm /root/.npm

# Change ownership and switch to non-root user
RUN chown -R nodejs:nodejs /opt/meeteasier
USER nodejs

EXPOSE 8080

# OAuth credentials and other sensitive data should be provided at runtime
# Example:
# docker run -e OAUTH_CLIENT_ID=xxx -e OAUTH_AUTHORITY=xxx -e OAUTH_CLIENT_SECRET=xxx ...
CMD [ "node", "server.js" ]
