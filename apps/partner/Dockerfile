FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.json ./
COPY pnpm-lock.yaml ./ 2>/dev/null || true
COPY packages ./packages
COPY apps/partner ./apps/partner
RUN pnpm install --filter @orbit/partner... --prod --frozen-lockfile || pnpm install --filter @orbit/partner... --prod
RUN pnpm --filter @orbit/partner build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=3002
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/partner/.next ./apps/partner/.next
COPY --from=builder /app/apps/partner/public ./apps/partner/public
COPY --from=builder /app/apps/partner/package.json ./apps/partner/package.json
COPY --from=builder /app/apps/partner/next.config.js ./apps/partner/next.config.js
CMD ["pnpm", "--dir", "apps/partner", "start"]
