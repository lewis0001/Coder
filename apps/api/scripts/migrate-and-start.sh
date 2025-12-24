#!/bin/sh
set -euo pipefail

# Generate Prisma client (safe to run multiple times)
pnpm prisma:generate

# Apply migrations if present; falls back to db push for fresh dev setups
if pnpm prisma:migrate:deploy; then
  echo "Migrations applied"
else
  echo "Migrations deploy failed; attempting prisma db push for bootstrap"
  pnpm prisma:db:push
fi

pnpm start
