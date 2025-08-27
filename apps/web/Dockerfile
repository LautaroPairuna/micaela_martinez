# ---- base ----
FROM node:20-alpine AS base
WORKDIR /repo

# ---- deps (workspace) ----
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm fetch
RUN pnpm -r install -w --offline

# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm --filter @app/web build

# ---- run ----
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node","apps/web/server.js"]
