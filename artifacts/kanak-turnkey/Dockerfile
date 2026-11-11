# Stage 1: Build React App with Vite
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy all workspace package.json files for workspace resolution
COPY artifacts/kanak-turnkey/package.json ./artifacts/kanak-turnkey/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/
COPY scripts/package.json ./scripts/

# Install dependencies (with frozen lockfile)
RUN pnpm install --frozen-lockfile

# Copy source files required to build frontend
COPY tsconfig.base.json tsconfig.json ./
COPY attached_assets/ ./attached_assets/
COPY lib/ ./lib/
COPY artifacts/kanak-turnkey/ ./artifacts/kanak-turnkey/

# Set memory allocation for Vite bundling in container environments
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build client bundle for production
RUN pnpm --filter @workspace/kanak-turnkey run build

# Stage 2: High performance production web server (Nginx)
FROM nginx:alpine AS runner

# Copy built web assets to Nginx html directory
COPY --from=builder /app/artifacts/kanak-turnkey/dist/public /usr/share/nginx/html

# Copy custom Nginx configuration
COPY artifacts/kanak-turnkey/nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports for HTTP and HTTPS
EXPOSE 80 443

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
