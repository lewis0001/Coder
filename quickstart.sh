#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "$0")"
LOG_DIR="$REPO_ROOT/logs"
API_LOG="$LOG_DIR/api.dev.log"
ADMIN_LOG="$LOG_DIR/admin.dev.log"
WITH_API_SERVICE=false
SHOW_HELP=false

usage() {
  cat <<'USAGE'
Usage: ./quickstart.sh [OPTIONS]

Options:
  --with-api-service   Also start the API container via docker-compose (in addition to postgres, redis, minio).
  -h, --help           Show this help message and exit.

This script installs dependencies, prepares configuration, starts required services,
performs database migrations/seeding, and launches the API and Admin UI in dev mode.
USAGE
}

log() { printf "[quickstart] %s\n" "$*"; }
warn() { printf "[quickstart][warn] %s\n" "$*"; }
error() { printf "[quickstart][error] %s\n" "$*" >&2; exit 1; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || error "Required command '$1' is not available in PATH."
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --with-api-service) WITH_API_SERVICE=true; shift ;;
      -h|--help) SHOW_HELP=true; shift ;;
      *) error "Unknown option: $1" ;;
    esac
  done
}

check_node_version() {
  require_command node
  local version major
  version=$(node -v | sed 's/^v//')
  major=${version%%.*}
  if [[ -z "$major" || "$major" -lt 18 ]]; then
    error "Node 18+ is required. Detected version: $version"
  fi
  log "Node version $version detected (ok)."
}

ensure_pnpm() {
  require_command corepack
  log "Enabling corepack to manage pnpm..."
  corepack enable >/dev/null 2>&1 || warn "corepack enable reported an issue; continuing with existing configuration."
  if ! command -v pnpm >/dev/null 2>&1; then
    error "pnpm is not available. Please install pnpm 9 (or ensure corepack can fetch it)."
  fi
  local version major
  version=$(pnpm --version)
  major=${version%%.*}
  if [[ -z "$major" || "$major" -lt 9 ]]; then
    error "pnpm 9+ is required. Detected version: $version"
  fi
  log "pnpm version $version detected (ok)."
}

select_compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    error "Neither 'docker compose' nor 'docker-compose' is available. Install Docker Desktop/Engine with Compose."
  fi
}

validate_docker() {
  require_command docker
  if ! docker info >/dev/null 2>&1; then
    error "Docker daemon does not appear to be running. Please start Docker and retry."
  fi
}

ensure_env_file() {
  if [[ ! -f "$REPO_ROOT/.env" ]]; then
    log "Creating .env from .env.example..."
    cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
  else
    log ".env already exists; keeping existing values."
  fi
}

escape_sed_value() {
  printf '%s' "$1" | sed -e 's/[\\&/|]/\\&/g'
}

portable_sed_in_place() {
  local expr="$1" file="$2"
  case "$(uname -s)" in
    Darwin*) sed -i '' "$expr" "$file" ;;
    *) sed -i "$expr" "$file" ;;
  esac
}

set_env_var() {
  local key="$1" value="$2" escaped
  escaped=$(escape_sed_value "$value")
  if grep -Eq "^${key}=" "$REPO_ROOT/.env"; then
    portable_sed_in_place "s|^${key}=.*|${key}=${escaped}|" "$REPO_ROOT/.env"
  else
    printf '%s=%s\n' "$key" "$value" >> "$REPO_ROOT/.env"
  fi
}

get_env_var() {
  local key="$1"
  if grep -Eq "^${key}=" "$REPO_ROOT/.env"; then
    grep -E "^${key}=" "$REPO_ROOT/.env" | head -n1 | cut -d '=' -f2-
  fi
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    date +%s%N
  fi
}

prompt_for_secret() {
  local key="$1" description="$2" current input
  current=$(get_env_var "$key")
  local display="${current:-unset}"
  printf "%s [%s]: " "$description" "$display"
  read -r input || true
  if [[ -n "$input" ]]; then
    set_env_var "$key" "$input"
  elif [[ -z "$current" || "$current" == changeme* || "$current" == "sk_test_replace" || "$current" == "whsec_replace" ]]; then
    if [[ "$key" == "JWT_SECRET" || "$key" == "REFRESH_SECRET" ]]; then
      local generated
      generated=$(generate_secret)
      set_env_var "$key" "$generated"
      log "Generated $key automatically."
    else
      warn "$key is using a placeholder. Update .env if you need a real secret."
    fi
  fi
}

prepare_env() {
  ensure_env_file
  log "Prompting for required secrets (press Enter to keep current values)."
  prompt_for_secret "JWT_SECRET" "JWT secret" 
  prompt_for_secret "REFRESH_SECRET" "Refresh token secret"
  prompt_for_secret "STRIPE_SECRET_KEY" "Stripe secret key"
  prompt_for_secret "STRIPE_WEBHOOK_SECRET" "Stripe webhook secret"
}

load_env() {
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
}

validate_database_url() {
  if [[ -z "${DATABASE_URL:-}" ]]; then
    error "DATABASE_URL is not set in .env; required for Prisma migrations and seeding."
  fi
  if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
    warn "DATABASE_URL does not look like a Postgres URL. Current value: $DATABASE_URL"
  fi
  log "DATABASE_URL detected."
}

install_dependencies() {
  log "Installing dependencies with pnpm..."
  (cd "$REPO_ROOT" && pnpm install)
}

start_services() {
  validate_docker
  local compose_cmd
  compose_cmd=$(select_compose_cmd)
  local services=(postgres redis minio)
  if $WITH_API_SERVICE; then
    services+=(api)
  fi
  log "Starting docker-compose services: ${services[*]}"
  (cd "$REPO_ROOT" && $compose_cmd up -d "${services[@]}")
}

run_prisma_tasks() {
  log "Running Prisma migrations..."
  (cd "$REPO_ROOT" && pnpm --filter @orbit/api prisma:migrate:dev)
  log "Seeding database..."
  (cd "$REPO_ROOT" && pnpm --filter @orbit/api prisma:seed)
}

start_background_processes() {
  mkdir -p "$LOG_DIR"
  log "Starting API (dev mode) in background..."
  (cd "$REPO_ROOT" && nohup pnpm --filter @orbit/api start:dev >"$API_LOG" 2>&1 & echo $! > "$LOG_DIR/api.pid")
  log "Starting Admin UI in background..."
  (cd "$REPO_ROOT" && nohup pnpm --filter @orbit/admin dev >"$ADMIN_LOG" 2>&1 & echo $! > "$LOG_DIR/admin.pid")
  log "Background processes started. Logs: $API_LOG, $ADMIN_LOG"
}

print_summary() {
  cat <<SUMMARY

Everything is set! Access your services:
- API:            http://localhost:3001/docs (Swagger)
- Admin console:  http://localhost:3000/login

Seeded credentials:
- Admin/Ops:   admin@orbit.local / AdminPass123!
- Partner:     partner@orbit.local / PartnerPass123!
- Courier:     courier@orbit.local / CourierPass123!
- User:        user@orbit.local / UserPass123!

To watch logs: tail -f "$API_LOG" "$ADMIN_LOG"
SUMMARY
}

main() {
  parse_args "$@"
  if $SHOW_HELP; then
    usage
    exit 0
  fi

  check_node_version
  ensure_pnpm
  prepare_env
  load_env
  validate_database_url
  install_dependencies
  start_services
  run_prisma_tasks
  start_background_processes
  print_summary
}

main "$@"
