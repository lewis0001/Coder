# Runbooks

## Local development
1. Copy `.env.example` to `.env` and set secrets (JWT, refresh, Stripe keys, REDIS_URL, DATABASE_URL).
2. Start infra: `docker-compose up -d postgres redis minio`.
3. Install dependencies: `pnpm install`.
4. Migrate DB: `pnpm --filter @orbit/api prisma:migrate:dev`.
5. Seed: `pnpm --filter @orbit/api prisma:seed`.
6. Run API: `pnpm --filter @orbit/api start:dev` (Swagger `/docs`, metrics `/v1/metrics`).
7. Run admin/partner: `pnpm --filter @orbit/admin dev`, `pnpm --filter @orbit/partner dev`. For containers, use `docker-compose up admin partner` (admin on 3000, partner on 3002, both point to the API container by default).
8. Run mobile: `pnpm --filter @orbit/mobile start` with `EXPO_PUBLIC_API_URL` set to API origin. Mobile icons are generated from text placeholders during install; if missing, run `pnpm --filter @orbit/mobile generate:assets`.

### Local smoke checks (Definition of Done)

- **API + Swagger**: ensure Postgres/Redis are running (step 2), then execute `pnpm --filter @orbit/api prisma:migrate:dev` followed by `pnpm --filter @orbit/api prisma:seed` and `pnpm --filter @orbit/api start:dev`. Confirm `/docs` returns Swagger JSON/HTML and `/v1/metrics` is reachable.
- **Admin sign-in**: start the admin app (step 7) and log in at `http://localhost:3000/login` with `admin@orbit.local` / `AdminPass123!`. Keep the default role set to `admin` unless you want to test restricted dashboards; you should land on `/dashboard` with navigation tabs for overview, operations, finance, and support.
- **Partner sign-in**: start the partner app (step 7) and log in at `http://localhost:3002/login` with `partner@orbit.local` / `PartnerPass123!`. A successful login routes to `/dashboard` and retains the seeded store association from `apps/api/prisma/seed.ts`.
- **Mobile sign-in**: run the Expo dev server (step 8) and load the app in Expo Go. From the Account tab, sign in with `user@orbit.local` / `UserPass123!` to unlock customer flows. Courier mode can be tested with `courier@orbit.local` / `CourierPass123!` using the same screen once `EXPO_PUBLIC_API_URL` points at the API.

## Mock integrations (local)
- **Auth OTP**: OTP delivery is mocked; supply any 6-digit code. Default seed accounts live in `apps/api/prisma/seed.ts`.
- **Notifications**: default provider logs payloads to stdout. Swap to a real provider by rebinding `NOTIFICATIONS_PROVIDER` in `NotificationsModule`.
- **Storage**: MinIO acts as S3-compatible storage locally; the API writes proof-of-delivery objects there. Use `mc ls` or the MinIO UI to inspect uploads.
- **Payments**: Stripe test keys are required; PaymentIntent confirmations in test mode update the wallet without charging real cards.

## Stripe webhook (local)
- Prereq: set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env`.
- Start API with raw body parsing enabled (default in main bootstrap).
- Run `stripe listen --forward-to localhost:3001/v1/payments/webhook/stripe`.
- Top up wallet via `/v1/wallet/topup` (JWT bearer). Verify webhook logs and ledger entries via `/v1/wallet/transactions`.

## Notifications queue
- Queue name: `notifications` (BullMQ, Redis-backed).
- Default provider: mock (logs payload). Swap provider by binding `NOTIFICATIONS_PROVIDER` in `NotificationsModule`.
- Processor runs inside API worker; ensure Redis is reachable via `REDIS_URL`.
- Enqueue messages via `NotificationsService.send()` or by adding producers in relevant modules.

## Realtime
- Gateway: Socket.IO namespace `/realtime` with Bearer token auth.
- Clients: use `@orbit/shared` → `createRealtimeClient(baseUrl, token)` and call `subscribeOrder(orderId)` or `subscribeTask(taskId)`.
- Server broadcasts `order_update` and `task_update` events when status/location changes.

## Courier demos (local)
- Seeded courier user: `courier@orbit.local` (`CourierPass123!`).
- Obtain JWT via `/v1/auth/login` and use in mobile Account tab or API calls.
- Courier endpoints: `/v1/courier/online`, `/v1/courier/location`, `/v1/courier/tasks/:id/accept`, `/v1/courier/tasks/:id/status`.
- Admin oversight: `/v1/admin/tasks` (list), `/v1/admin/tasks/:id/assign`, `/v1/admin/tasks/:id/status`.

## Box demo (mobile/API)
- Seeded region: `seed-region-orbit`; dropoff address: `seed-address-user`; customer: `seed-user-customer`.
- Estimate: `POST /v1/box/estimate` with coordinates; create: `POST /v1/box/shipments` using seeded IDs for quick testing.
- Mobile Box screen reads defaults from Expo extras (`defaultRegionId`, `defaultCustomerUserId`, `defaultDropoffAddressId`).

## Troubleshooting
- Prisma client out of date: run `pnpm --filter @orbit/api prisma:generate`.
- Migrations in container: API image runs `scripts/migrate-and-start.sh`; ensure `DATABASE_URL` is reachable from container network.
- Stuck BullMQ jobs: check Redis connectivity; clear queue with BullMQ admin or flush Redis in local dev.

## Stripe webhook testing
- Ensure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set in your `.env` (test keys only).
- Start the API service (`pnpm --filter @orbit/api start:dev` or Docker compose).
- Expose a tunnel for local webhook delivery (e.g., `stripe listen --forward-to localhost:3001/v1/payments/webhook/stripe`).
- Trigger a test event (`stripe trigger payment_intent.succeeded`) to update the wallet ledger status.
- Check logs for `PaymentsService` to confirm signature verification and ledger updates. Failed intents create a reversal entry for the wallet.

## Database migrations and Prisma client

- Generate Prisma client locally: `pnpm --filter @orbit/api prisma:generate`
- Create/apply migrations in dev: `pnpm --filter @orbit/api prisma:migrate:dev`
- Apply migrations in CI/prod (expects DATABASE_URL): `pnpm --filter @orbit/api prisma:migrate:deploy`
- Bootstrap schema without migrations (first-time local): `pnpm --filter @orbit/api prisma:db:push`
- The API Docker image executes `scripts/migrate-and-start.sh`, which runs `prisma migrate deploy` (and falls back to `db push` if no migrations exist) before starting the server, ensuring schema alignment at container start.

## Payments and Stripe (local)

- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env` before running the API. Test keys are fine for local development.
- Wallet endpoints under `/v1/wallet` require a valid JWT bearer token (use seeded user credentials with `/v1/auth/login`).
- Create a top-up PaymentIntent via `POST /v1/wallet/topup` with `{ "amount": 10 }`; the API records the PaymentIntent and credits the wallet for local convenience.
- Webhook verification is enabled; forward Stripe events to `http://localhost:3001/v1/payments/webhook/stripe` with the matching webhook secret for signature validation and ledger updates.
- Promotions and loyalty: seed includes promo code `WELCOME10` (10% off). Validate codes using `POST /v1/wallet/apply-promo` with `{ "code": "WELCOME10", "subtotal": 50 }`. Default loyalty rule earns 1 point per currency unit and redeems at 0.01.

## Notifications queue (BullMQ)

- Redis connection is configured from `REDIS_URL`; BullMQ is initialized globally in the API.
- Notification jobs are enqueued to the `notifications` queue; the default mock provider runs in-process via `NotificationsProcessor`.
- To enqueue from code, inject `NotificationsService` and call `send(channel, payload)`; jobs are processed asynchronously. Use `sendImmediately` only for synchronous debug flows.
- Swap the provider by binding a new class to `NOTIFICATION_PROVIDER_TOKEN` inside `NotificationsModule`.

## Observability

- Health: `GET /v1/health` pings the database and returns readiness metadata.
- Metrics: scrape `GET /v1/metrics` (text/plain) for Prometheus counters including `http_requests_total` and `service_up`.
- Logging: Pino is configured with request IDs and pretty output in non-production; set `LOG_LEVEL` to adjust verbosity. If you supply `x-request-id` on incoming requests it will be preserved; otherwise a UUID is generated and echoed back in the response header for trace correlation.

## Courier mode (local demos)

- Seeded courier user/email: `courier@orbit.local` (password `CourierPass123!`).
- Obtain an access token via `POST /v1/auth/login` and use it as the bearer token for courier endpoints and the mobile courier panel.
- Courier API endpoints: `POST /v1/courier/online`, `POST /v1/courier/location`, `POST /v1/courier/tasks/:id/accept`, and `POST /v1/courier/tasks/:id/status` (requires COURIER role JWT).
- Mobile courier controls live under the Account tab; configure `apps/mobile/app.json` extras (token/user IDs) or set `EXPO_PUBLIC_*` env vars for Expo to reach your API.

## Box mobile defaults

- Seeded region and IDs for demos: region `seed-region-orbit`, customer user `seed-user-customer`, dropoff address `seed-address-user`.
- Expo config (`apps/mobile/app.json` or `EXPO_PUBLIC_*`) includes `defaultRegionId`, `defaultCustomerUserId`, and `defaultDropoffAddressId` to prefill the Box screen.
- The Box screen fetches estimates via `/v1/box/estimate` and sends demo creates to `/v1/box/shipments`; update the defaults if you regenerate seeds.
