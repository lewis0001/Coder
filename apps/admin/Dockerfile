FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.json ./
COPY pnpm-lock.yaml ./ 2>/dev/null || true
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN pnpm install --filter @orbit/admin... --prod --frozen-lockfile || pnpm install --filter @orbit/admin... --prod
RUN pnpm --filter @orbit/admin build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=builder /app/apps/admin/next.config.js ./apps/admin/next.config.js
CMD ["pnpm", "--dir", "apps/admin", "start"]
