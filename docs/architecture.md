# Architecture

## Monorepo layout
- **apps/api**: NestJS service providing REST (`/v1`), WebSocket realtime gateway (`/realtime`), Stripe webhook receiver, BullMQ jobs, and Prisma data access.
- **apps/admin**: Next.js 14 app for ops staff (RBAC enforced via API JWT) with Tailwind and React Query.
- **apps/partner**: Next.js 14 portal for restaurants/stores to manage catalog/availability.
- **apps/mobile**: Expo/React Native client with Orbit design tokens, EN/AR localization, bottom tabs, cart, box, wallet, and courier controls.
- **packages/shared**: Shared helpers (realtime client, types) consumed by web/mobile.
- **packages/ui**: Design tokens (colors, spacing, typography, radii, shadows) shared across surfaces.
- **packages/config**: Reusable lint/format/ts/jest configs.

## Runtime topology
- **API** (NestJS) runs on port 3001 by default. Depends on PostgreSQL (Prisma), Redis (BullMQ + caching), and MinIO for object storage.
- **Redis/BullMQ**: queue connection configured via `REDIS_URL`; notifications queue runs within the API worker today.
- **PostgreSQL**: primary data store; Prisma migrations manage schema.
- **MinIO/S3**: placeholder for object storage (proof of delivery, assets).
- **Stripe**: PaymentIntents for card/wallet top-ups; webhook verification via `STRIPE_WEBHOOK_SECRET`.
- **WebSockets**: Socket.IO gateway authenticates Bearer JWT, joins order/task rooms, broadcasts status/location updates.

## Core flows
- **Auth**: email/password + refresh tokens with OTP mock; roles (USER, COURIER, PARTNER, OPS, ADMIN) enforced via guards.
- **Food/Shop**: browse endpoints plus admin catalog management; mobile consumes public browse and uses client cart state (checkout integration pending).
- **Box**: price estimate -> create BOX order with delivery task; admin oversight for task assignment/status updates; mobile demo flow calls estimate/create with seeded defaults.
- **Wallet/Payments**: wallet ledger + transactions; Stripe top-up PaymentIntent creation; promos/loyalty seeded; webhook updates payment status and wallet credits.
- **Courier**: mobile/account controls for online toggle, location pings, task accept/status; admin oversight endpoints; courier shifts recorded when going online.
- **Notifications**: abstraction with mock provider; BullMQ queue dispatch; future providers can be registered via the provider token.
- **Observability**: health check, `/v1/metrics` Prometheus endpoint, structured logs (pino) with request IDs propagated via the `x-request-id` header, request validation, rate limiting on auth.

## Deployment considerations
- **Local**: `docker-compose.yml` for Postgres/Redis/MinIO/API; Next.js and mobile run via `pnpm dev`/Expo.
- **CI**: GitHub Actions runs lint/test/build across all workspaces.
- **Env separation**: `env.validation.ts` enforces required variables; secrets provided via `.env` locally and platform secret stores in higher envs.
