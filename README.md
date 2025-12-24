# Orbit Superapp Monorepo

This repository hosts the Orbit super-app platform (original brand), including backend (NestJS), web portals (Next.js), and mobile client (Expo/React Native). The monorepo uses pnpm workspaces with shared configuration packages.

## Getting Started
Follow these steps for a clean local spin-up:

1) Install pnpm (v9 recommended) and Node 18+.
2) Copy `.env.example` to `.env` and adjust secrets (JWT/Stripe) plus database URLs as needed.
3) Install dependencies: `pnpm install` at the repo root.
4) Start infra services locally: `docker-compose up -d postgres redis minio` (add `api` to run the containerized API).
5) Run database migrations and generate Prisma client: `pnpm --filter @orbit/api prisma:migrate:dev` (requires `DATABASE_URL`).
6) Seed local data: `pnpm --filter @orbit/api prisma:seed` (creates default users, restaurants, store catalog, promotions, loyalty rule, courier, and pricing rules).
7) Start the API locally: `pnpm --filter @orbit/api start:dev` (Swagger at `/docs`).
8) Start portals and mobile:
   - Admin (Next.js): `pnpm --filter @orbit/admin dev` → visit `http://localhost:3000/login` and sign in with seeded admin. To run in containers, use `docker-compose up admin` (builds `apps/admin/Dockerfile`, binds port 3000, and points `NEXT_PUBLIC_API_URL` to the API container).
   - Partner (Next.js): `pnpm --filter @orbit/partner dev` → visit `http://localhost:3001/login` (Next default port may vary) and sign in with seeded partner. The login form exchanges credentials with the API (`NEXT_PUBLIC_API_URL`, defaults to `http://localhost:3001`) and stores a bearer token for catalog updates. To run in containers, use `docker-compose up partner` (builds `apps/partner/Dockerfile`, binds port 3002, uses `NEXT_PUBLIC_API_URL=http://api:3001`).
   - Mobile (Expo): `pnpm --filter @orbit/mobile start` and set `EXPO_PUBLIC_API_URL` (or `apps/mobile/app.json` `extra.apiUrl`) to reach the API. Mobile icons are generated from text placeholders during install; if assets are missing, run `pnpm --filter @orbit/mobile generate:assets`.
9) CI: GitHub Actions runs `pnpm -r lint`, `pnpm -r test`, and `pnpm -r build` (see `.github/workflows/ci.yml`).

### Service endpoints & developer tips
- API base path: `/v1` (Swagger/OpenAPI at `/docs`).
- Stripe webhook receiver: `POST /v1/payments/webhook/stripe` (raw body, signature verified). Local: `stripe listen --forward-to localhost:3001/v1/payments/webhook/stripe`.
- Courier controls: `/v1/courier/online` (toggle), `/v1/courier/location`, `/v1/courier/tasks/:id/accept`, `/v1/courier/tasks/:id/status` (Bearer JWT with COURIER role).
- Metrics: `GET /v1/metrics` (Prometheus format). Health: `GET /v1/health`.
- Admin REST: restaurants/menus under `/v1/admin/restaurants`, store/catalog under `/v1/admin/stores`, tasks under `/v1/admin/tasks` (JWT with ADMIN/OPS role).
- Partner REST: catalog under `/v1/partner/catalog` (JWT with PARTNER role) for listing store catalog plus updating product price/availability, variants, and inventory scoped to the partner-linked store.
- Realtime: WebSocket namespace `/realtime` with Bearer auth; emit `subscribe_order` or `subscribe_task` to receive `order_update`/`task_update` broadcasts. Shared helper: `@orbit/shared` → `createRealtimeClient`.
- Notifications: BullMQ-backed `/notifications` queue; default mock provider can be swapped for email/SMS/push.
- Mobile box demo defaults: seeded region `seed-region-orbit`, customer `seed-user-customer`, dropoff address `seed-address-user` (override via Expo extras or `EXPO_PUBLIC_*`).
- Courier mobile demo: set `EXPO_PUBLIC_COURIER_TOKEN` or `extra.courierToken` with a JWT issued for the seeded courier user.
- Wallet + payments: set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; use `/v1/wallet/topup` (JWT bearer) for PaymentIntent creation.

### Default local credentials
- Admin/Ops: `admin@orbit.local` / `AdminPass123!`
- Partner: `partner@orbit.local` / `PartnerPass123!`
- Courier: `courier@orbit.local` / `CourierPass123!`
- User: `user@orbit.local` / `UserPass123!`

## Structure
- `apps/` – service and client applications (api, admin, partner, mobile)
- `packages/` – shared libraries and configuration
- `docs/` – architecture, brand, and runbooks (in progress)

## Status
Active development toward production readiness: backend/auth foundations, partner/admin consoles, mobile shell with localization and live data, wallet/payments scaffolding, realtime tracking, courier flows, and observability in place. Follow `/TODO.md` for current progress and see `docs/brand.md` for design tokens and visual direction.
