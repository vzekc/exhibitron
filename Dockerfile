# Single container: Fastify backend serves GraphQL/REST + frontend/dist
# via @fastify/static. No nginx sidecar needed — one image, one process.
FROM node:22-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@8.15.9 --activate

WORKDIR /src
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json   backend/package.json
COPY frontend/package.json  frontend/package.json
RUN --mount=type=cache,id=pnpm-ex,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
# pnpm build runs: backend generate (graphql + gql.tada) -> frontend build
# (vite) -> backend build (tsc + mikro-orm cache). Order matters.
RUN pnpm run build


FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# sharp's native binaries need libvips at runtime. The Debian package is
# small; pulling it in is cheaper than going alpine and fighting musl.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libvips ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@8.15.9 --activate

RUN useradd --uid 10001 --create-home --shell /bin/bash exhibitron \
 && chown exhibitron:exhibitron /app
USER exhibitron

# Copy the full workspace so mikro-orm-esm (dev dep used for migrations)
# stays reachable — the migration runner is invoked at pod start.
COPY --chown=exhibitron:exhibitron --from=builder /src /app

EXPOSE 3001
ENV NODE_ENV=production

# tini shields sharp's worker-threads from zombie-handling quirks under
# kubectl exec / signal handling.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-c", "cd backend && npx mikro-orm-esm migration:up && exec node dist/server.js"]
