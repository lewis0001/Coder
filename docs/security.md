# Security Notes

## Identity & auth
- Email/password with bcrypt hashing and JWT access tokens (15m default) + refresh tokens.
- OTP mock provider for phone-based verification in local dev (configurable code via env).
- RBAC roles: USER, COURIER, PARTNER, OPS, ADMIN. Controllers enforce via decorators/guards; admin/partner/courier routes require role membership.
- Rate limiting on auth endpoints via Nest Throttler.

## Data protection
- Prisma schema includes soft-delete fields on business entities where appropriate.
- Environment validation ensures secrets (JWT, refresh, Stripe) are present at boot.
- Sensitive headers (Authorization) redacted from logs.

## Webhooks & payments
- Stripe webhook verification uses raw body with `STRIPE_WEBHOOK_SECRET`; rejects invalid signatures.
- PaymentIntents carry idempotency and wallet metadata for reconciliation; wallet ledger entries recorded for top-ups and reversals.

## Transport & CORS
- Helmet and CORS enabled globally in the API bootstrap; expect TLS termination in higher environments.

## Auditing & admin controls
- Admin routes (restaurants/stores/tasks) require ADMIN or OPS roles and are documented in `docs/api.md`.
- Task events recorded on courier status updates; admin task updates also append events for auditability.

## Secrets management
- Local development uses `.env`; production should source secrets from a vault/secret manager (not committed).

## Testing & linting
- Jest unit coverage for auth guards, services, and wallet/payments logic.
- GitHub Actions runs lint/test/build across the workspace.
