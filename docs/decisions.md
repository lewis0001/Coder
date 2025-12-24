# Architectural Decisions

## ADR-001: Monorepo with pnpm
- Use pnpm workspaces to share config, UI tokens, and helpers across api/web/mobile.
- Keeps lint/test/build orchestrated via `pnpm -r` and GitHub Actions matrix.

## ADR-002: NestJS + Prisma backend
- Chosen for strong TypeScript support, module system, and first-class decorators/validation.
- Prisma provides schema migrations, typed client, and seed tooling for the mandated data model.

## ADR-003: WebSockets for realtime
- Socket.IO gateway exposes order/task rooms under `/realtime` with JWT auth.
- Alternative SSE considered but deferred; Socket.IO aligns with React Native/web clients and existing libs.

## ADR-004: Stripe PaymentIntents
- PaymentIntents with webhooks ensure idempotent wallet top-ups and refunds; aligns with test-mode requirements.
- Webhook verification enforced via `STRIPE_WEBHOOK_SECRET` using raw body parsing.
