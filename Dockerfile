FROM node:20-alpine

ARG OAUTH_CLIENT_ID
ARG OAUTH_AUTHORITY
ARG OAUTH_CLIENT_SECRET

ENV OAUTH_CLIENT_ID=$OAUTH_CLIENT_ID
ENV OAUTH_AUTHORITY=$OAUTH_AUTHORITY
ENV OAUTH_CLIENT_SECRET=$OAUTH_CLIENT_SECRET
ENV NODE_ENV=production

# Update packages and install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /opt/meeteasier

# Copy package files first for better caching
COPY package*.json ./
COPY ui-react/package*.json ./ui-react/

# Install dependencies (including dev dependencies for build)
RUN npm install && cd ui-react && npm install

# Copy source code
COPY . .
COPY .env.template .env

# Build SCSS first
RUN npm run build-css

# Build React application
RUN cd ui-react && npm run build

# Remove dev dependencies and npm to reduce CVEs
RUN npm prune --omit=dev && \
    cd ui-react && npm prune --omit=dev && \
    npm cache clean --force && \
    rm -rf /usr/local/lib/node_modules/npm && \
    rm -rf /usr/local/bin/npm /usr/local/bin/npx && \
    rm -rf ~/.npm

# Change ownership and switch to non-root user
RUN chown -R nodejs:nodejs /opt/meeteasier
USER nodejs

EXPOSE 8080

CMD [ "node", "server.js" ]
