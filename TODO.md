# TODO

## Epic 0: Repo & Tooling Baseline
- [x] Establish pnpm workspaces and root package configuration (files: pnpm-workspace.yaml, package.json; verification: manual inspection)
- [x] Add linting/formatting configs (ESLint, Prettier, tsconfig base) (files: packages/config/**/*; verification: manual inspection)
- [x] Setup gitignore and editorconfig (files: .gitignore, .editorconfig; verification: manual inspection)
- [x] Initialize app/package folder structure (files: apps/*/package.json, packages/*/package.json; verification: manual inspection)
- [x] Docker Compose skeleton for services (files: docker-compose.yml, .env.example; verification: manual inspection)

## Epic 1: Auth & Security
- [x] Configure NestJS auth modules (JWT, refresh, OTP mock) (files: apps/api/src/auth/*, apps/api/src/app.module.ts; verification: unit test manual review)
- [x] Implement RBAC roles and guards (files: apps/api/src/auth/guards/*, apps/api/src/auth/decorators/roles.decorator.ts; verification: manual inspection)
- [x] Rate limiting middleware for auth endpoints (files: apps/api/src/app.module.ts, apps/api/src/auth/auth.controller.ts; verification: manual inspection)

## Epic 2: Core Data Model (Prisma)
- [x] Add Prisma schema with required models and indexes (files: apps/api/prisma/schema.prisma; verification: manual inspection)
- [x] Configure migrations and Prisma client generation (files: apps/api/package.json, apps/api/scripts/migrate-and-start.sh, apps/api/Dockerfile, docker-compose.yml, docs/runbooks.md; verification: manual inspection)

## Epic 3: Food (Mobile + API + Admin)
- [x] API endpoints for restaurants and menus (files: apps/api/src/food/*, apps/api/src/app.module.ts; verification: unit test manual review)
- [x] Admin management of restaurants/menus (files: apps/api/src/admin/*, docs/api.md, README.md; verification: manual inspection + unit test review)
- [x] Mobile browsing and cart for food (files: apps/mobile/src/screens/HomeScreen.tsx, apps/mobile/src/screens/FoodScreen.tsx, apps/mobile/src/screens/OrdersScreen.tsx, apps/mobile/src/state/cart.ts; verification: manual inspection)

## Epic 4: Shop (Mobile + API + Admin)
- [x] API endpoints for products/categories/search (files: apps/api/src/shop/*, apps/api/src/app.module.ts; verification: unit test manual review)
- [x] Admin store/catalog management (files: apps/api/src/admin/admin.stores.* apps/api/src/admin/dto/*, docs/api.md, README.md; verification: unit test manual review)
- [x] Mobile shop browsing and cart (files: apps/mobile/src/screens/HomeScreen.tsx, apps/mobile/src/screens/ShopScreen.tsx, apps/mobile/src/screens/OrdersScreen.tsx, apps/mobile/src/state/cart.ts; verification: manual inspection)

## Epic 5: Box/Courier (Mobile + API + Admin)
- [x] Box shipment APIs (estimate/create/view) (files: apps/api/src/box/*, apps/api/prisma/schema.prisma, apps/api/prisma/seed.ts, docs/api.md; verification: manual inspection)
- [x] Admin oversight for courier tasks (files: apps/api/src/admin/admin.tasks.* apps/api/src/admin/dto/*, docs/api.md, README.md; verification: manual inspection)
- [x] Mobile box flow UI (apps/mobile/src/screens/BoxScreen.tsx, apps/mobile/src/lib/api.ts; verification: manual inspection)

## Epic 6: Wallet & Payments (Stripe + Ledger)
- [x] Stripe integration scaffold and webhook handling (files: apps/api/src/wallet/*, apps/api/src/payments/*, apps/api/src/stripe/*, apps/api/src/config/env.validation.ts; verification: unit test manual review)
- [x] Wallet ledger models and endpoints (files: apps/api/src/wallet/*; verification: unit test manual review)
- [x] Promo/loyalty baseline logic (files: apps/api/src/wallet/*, apps/api/prisma/seed.ts; verification: unit test manual review)

## Epic 7: Real-time Tracking (WS/SSE)
- [x] NestJS gateway scaffold for order/task channels (files: apps/api/src/realtime/*; verification: unit test manual review)
- [x] Client subscription utilities (mobile/web) (files: packages/shared/src/realtime.ts; verification: manual inspection)

## Epic 8: Admin Portal (Ops)
- [x] Next.js admin app scaffold with auth shell (files: apps/admin/*; verification: manual inspection)
- [x] RBAC routing and dashboard layout (files: apps/admin/src/app/dashboard/*, apps/admin/middleware.ts; verification: manual inspection)

## Epic 9: Partner Portal
- [x] Next.js partner app scaffold with auth shell (files: apps/partner/*; verification: manual inspection)
- [x] Catalog management views (files: apps/partner/src/app/catalog/page.tsx, apps/partner/src/components/catalog-manager.tsx, apps/partner/middleware.ts; verification: manual inspection)
- [x] Partner catalog APIs (files: apps/api/src/partner/*, apps/api/prisma/schema.prisma, apps/api/prisma/seed.ts; verification: unit test manual review)

## Epic 10: Courier Mode
- [x] Courier online/offline and task actions API (files: apps/api/src/courier/*, apps/api/src/common/req-user.decorator.ts, apps/api/src/app.module.ts, apps/api/prisma/seed.ts; verification: unit test manual review)
- [x] Mobile courier mode UI (files: apps/mobile/src/screens/AccountScreen.tsx, apps/mobile/src/i18n/locales/*; verification: manual inspection)

## Epic 11: Notifications (Push/Email/SMS abstractions)
- [x] Notification service abstraction and providers (files: apps/api/src/notifications/*; verification: unit test manual review)
- [x] Queue-based dispatch jobs (files: apps/api/src/app.module.ts, apps/api/src/notifications/*; verification: manual inspection)

## Epic 12: Observability & Resilience (Logs/Metrics/Jobs)
- [x] Structured logging and request tracing (files: apps/api/src/app.module.ts, apps/api/src/main.ts, docs/runbooks.md; verification: manual inspection)
- [x] Health checks and metrics endpoint (files: apps/api/src/health.controller.ts, apps/api/src/app.service.ts, apps/api/src/metrics/*; verification: unit test manual review)
- [x] Swagger/OpenAPI docs at /docs (files: apps/api/src/main.ts; verification: manual inspection)
- [x] BullMQ setup for background jobs (files: apps/api/src/app.module.ts, apps/api/src/notifications/*; verification: manual inspection)

## Epic 13: Localization & RTL
- [x] i18n setup for mobile and web (EN/AR) (files: apps/mobile/src/i18n/*, apps/mobile/App.tsx; verification: manual inspection)
- [x] RTL layout support baseline (files: apps/mobile/App.tsx, apps/mobile/src/screens/AccountScreen.tsx; verification: manual inspection)

## Epic 14: CI/CD + Docker + Deploy Skeleton
- [x] GitHub Actions CI pipeline (lint/test/build) (files: .github/workflows/ci.yml; verification: manual inspection)
- [x] Dockerfiles and compose services wired (files: .dockerignore, docker-compose.yml, apps/admin/Dockerfile, apps/partner/Dockerfile; verification: manual inspection)

## Epic 15: Tests + Seed Data + QA Scripts
- [x] Jest setup across workspaces (files: packages/config/jest/base.js, packages/shared/jest.config.js, packages/ui/jest.config.js, packages/shared/src/realtime.test.ts, packages/ui/src/tokens.test.ts, packages/shared/package.json, packages/ui/package.json; verification: manual inspection)
- [x] Seed data scripts for Prisma (files: apps/api/prisma/seed.ts, README.md; verification: manual inspection)
- [x] Basic integration tests per service (files: apps/api/src/health.e2e-spec.ts, apps/api/src/food.e2e-spec.ts, apps/api/src/shop.e2e-spec.ts, apps/api/src/box.e2e-spec.ts, apps/api/src/wallet.e2e-spec.ts, apps/api/src/courier.e2e-spec.ts, apps/api/src/partner.e2e-spec.ts; verification: manual inspection)

## Epic 16: Documentation & Runbooks
- [x] README with setup steps (files: README.md; verification: manual inspection)
- [x] /docs architecture, api, security, decisions, runbooks (files: docs/architecture.md, docs/security.md, docs/decisions.md, docs/runbooks.md; verification: manual inspection)
- [x] Stripe/webhook/local mock documentation (files: README.md, docs/runbooks.md; verification: manual inspection)

## Epic 17: ORIGINAL Brand & UI System
- [x] Create brand guide in /docs/brand.md (files: docs/brand.md; verification: manual inspection)
- [x] Implement design tokens in /packages/ui (files: packages/ui/src/tokens.ts, packages/ui/tsconfig.json, packages/ui/.eslintrc.js, packages/ui/package.json; verification: manual inspection)
- [x] Apply tokens in web/mobile shells (files: apps/mobile/App.tsx, apps/mobile/src/screens/*, apps/admin/src/app/globals.css; verification: manual inspection)

## Definition of Done
- [ ] `pnpm -r lint` passes
- [ ] `pnpm -r test` passes
- [x] API boots locally, migrations run, Swagger available at /docs
- [x] Admin boots locally and can login as seeded admin
- [x] Partner boots locally and can login as seeded partner
- [x] Mobile boots in Expo and can login as seeded user
- [ ] End-to-end flows for Food, Shop, Box with tracking and payments
- [ ] Wallet top-up and ledger verified
- [ ] Stripe webhooks documented and functional in local
- [x] Mock integrations documented in /docs/runbooks.md
