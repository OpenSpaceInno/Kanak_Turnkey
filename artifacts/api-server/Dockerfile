# Multi-stage Dockerfile for Kanak Turnkey API Server
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy all package.json files for workspace dependency resolution
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/kanak-turnkey/package.json ./artifacts/kanak-turnkey/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib/db/package.json ./lib/db/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY scripts/package.json ./scripts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files required for backend
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ ./lib/
COPY scripts/ ./scripts/
COPY artifacts/api-server/ ./artifacts/api-server/

# Build backend bundle
RUN pnpm --filter @workspace/api-server run build

# Production runtime stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000

# Copy node_modules and built dist from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY --from=builder /app/lib/db ./lib/db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "artifacts/api-server/dist/index.mjs"]
