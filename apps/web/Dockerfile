# Build context: repository root (the pnpm workspace).
# Railway: set "Dockerfile Path" to apps/web/Dockerfile and leave the root directory at /.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter web... --filter @job-hunter/shared...

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
# API_PROXY_TARGET is inlined into the Next.js rewrites at build time.
ARG API_PROXY_TARGET=http://localhost:4000
ENV API_PROXY_TARGET=$API_PROXY_TARGET
RUN pnpm --filter @job-hunter/shared build && pnpm --filter web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "exec", "next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
