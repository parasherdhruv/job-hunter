# Build context: repository root (the pnpm workspace).
# Railway: set "Dockerfile Path" to apps/api/Dockerfile and leave the root directory at /.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- deps: install with the workspace lockfile so builds are reproducible -----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter api... --filter @job-hunter/shared...

# --- build: compile shared types, generate the Prisma client, compile the API -
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @job-hunter/shared build \
 && pnpm --filter api exec prisma generate \
 && pnpm --filter api build

# --- runtime -----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
WORKDIR /app/apps/api
EXPOSE 4000
# Apply pending migrations, then serve. `migrate deploy` is idempotent.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
