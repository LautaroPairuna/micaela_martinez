# ---- base ----
FROM node:20-alpine AS base
WORKDIR /repo
# ---- deps (workspace) ----
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm fetch
RUN pnpm -r install -w --offline
# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm --filter @app/api build
# ---- run ----
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
RUN pnpm i --prod --ignore-scripts
EXPOSE 3001
CMD ["node","dist/main.js"]
