# ---- base ----
FROM node:20-alpine AS base
WORKDIR /repo

# ---- build ----
FROM base AS build
# Copy root files needed for tsconfig
COPY packages/tsconfig/ packages/tsconfig/
# Copy api files
COPY apps/api/ apps/api/

WORKDIR /repo/apps/api
RUN npm ci
RUN npx prisma generate
RUN npm run build

# ---- run ----
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /repo/apps/api/package.json ./
COPY --from=build /repo/apps/api/package-lock.json ./

# Install prod deps (includes prisma CLI as it is in dependencies)
RUN npm ci --only=production --ignore-scripts

COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma

EXPOSE 3001
CMD ["npm", "run", "start:prod"]
