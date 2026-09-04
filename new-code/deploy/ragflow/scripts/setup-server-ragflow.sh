#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${RAGFLOW_PROJECT_NAME:-smart-product-ragflow}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION="$(tr -d '\r\n' < "$DEPLOY_ROOT/VERSION")"
RUNTIME_ROOT="$DEPLOY_ROOT/vendor/$VERSION"
COMPOSE_FILE="$RUNTIME_ROOT/docker-compose.yml"
SAFETY_COMPOSE_FILE="${RAGFLOW_SAFETY_COMPOSE_FILE:-$RUNTIME_ROOT/docker-compose.safety.yml}"
ENV_EXAMPLE="$RUNTIME_ROOT/.env.example"
ENV_FILE="$RUNTIME_ROOT/.env"
APP_ROOT="${SMART_PRODUCT_APP_ROOT:-$(cd "$DEPLOY_ROOT/../.." && pwd)}"
APP_ENV="${SMART_PRODUCT_ENV_FILE:-$APP_ROOT/.env.next}"
APP_COMPOSE="${SMART_PRODUCT_COMPOSE_FILE:-$APP_ROOT/docker-compose.next.yml}"
# Set ENABLE_BACKEND_AI=true only when you explicitly want this script to modify
# the main Spring environment and network. The default is intentionally false.
ENABLE_BACKEND_AI="${ENABLE_BACKEND_AI:-false}"

random_hex() {
  local bytes="${1:-24}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  else
    tr -dc 'a-f0-9' < /dev/urandom | head -c "$((bytes * 2))"
  fi
}

set_kv() {
  local file="$1" key="$2" value="$3" tmp
  tmp="$(mktemp)"
  if grep -qE "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" 'BEGIN{done=0} $0 ~ "^" k "=" {print k "=" v; done=1; next} {print} END{if(!done) print k "=" v}' "$file" > "$tmp"
  else
    cat "$file" > "$tmp"
    printf '\n%s=%s\n' "$key" "$value" >> "$tmp"
  fi
  cat "$tmp" > "$file"
  rm -f "$tmp"
}

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "RAGFlow compose not found: $COMPOSE_FILE" >&2
  exit 1
fi

# The safety override is part of this release package. If it is absent, fail
# rather than silently bringing back the unsafe vendor memory limit.
if [ ! -f "$SAFETY_COMPOSE_FILE" ]; then
  echo "RAGFlow safety override not found: $SAFETY_COMPOSE_FILE" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  set_kv "$ENV_FILE" ELASTIC_PASSWORD "$(random_hex 24)"
  set_kv "$ENV_FILE" OPENSEARCH_PASSWORD "RfA1!$(random_hex 20)"
  set_kv "$ENV_FILE" OCEANBASE_PASSWORD "$(random_hex 24)"
  set_kv "$ENV_FILE" SEEKDB_PASSWORD "$(random_hex 24)"
  set_kv "$ENV_FILE" MYSQL_PASSWORD "$(random_hex 24)"
  set_kv "$ENV_FILE" MINIO_PASSWORD "$(random_hex 24)"
  set_kv "$ENV_FILE" REDIS_PASSWORD "$(random_hex 24)"
  chmod 600 "$ENV_FILE"
  echo "Created RAGFlow env: $ENV_FILE"
fi

COMPOSE_FILES=(-f "$COMPOSE_FILE" -f "$SAFETY_COMPOSE_FILE")
cd "$RUNTIME_ROOT"
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" up -d

RAG_NET="$(docker network ls --format '{{.Name}}' | grep -E "^${PROJECT_NAME}_ragflow$" | head -n 1 || true)"
if [ -z "$RAG_NET" ]; then
  RAG_NET="$(docker network ls --format '{{.Name}}' | grep -E 'ragflow.*ragflow|ragflow$' | head -n 1 || true)"
fi

if [ "$ENABLE_BACKEND_AI" = "true" ] && [ -n "$RAG_NET" ] && [ -f "$APP_ENV" ]; then
  cp -a "$APP_ENV" "$APP_ENV.before-ragflow-$(date +%Y%m%d_%H%M%S)"
  set_kv "$APP_ENV" APP_AI_ENABLED true
  set_kv "$APP_ENV" RAGFLOW_BASE_URL http://ragflow-cpu:9380
  set_kv "$APP_ENV" RAGFLOW_CONNECT_TIMEOUT 5s
  set_kv "$APP_ENV" RAGFLOW_READ_TIMEOUT 60s
  if [ -n "${RAGFLOW_API_KEY:-}" ]; then set_kv "$APP_ENV" RAGFLOW_API_KEY "$RAGFLOW_API_KEY"; fi
  if [ -n "${LLM_BASE_URL:-}" ]; then set_kv "$APP_ENV" LLM_BASE_URL "$LLM_BASE_URL"; fi
  if [ -n "${LLM_API_KEY:-}" ]; then set_kv "$APP_ENV" LLM_API_KEY "$LLM_API_KEY"; fi
  if [ -n "${LLM_MODEL:-}" ]; then set_kv "$APP_ENV" LLM_MODEL "$LLM_MODEL"; fi
  chmod 600 "$APP_ENV"

  if [ -f "$APP_COMPOSE" ] && command -v python3 >/dev/null 2>&1; then
    python3 - "$APP_COMPOSE" "$RAG_NET" <<'PY'
import re, sys
from pathlib import Path
p = Path(sys.argv[1])
net = sys.argv[2]
s = p.read_text()
if net not in s:
    pat = r'(  spring-server:\n(?:.*?\n)*?    networks:\n)(      - smart-product-next-net\n)'
    ns, n = re.subn(pat, r'\1\2      - ' + net + '\n', s, count=1)
    if n != 1:
        raise SystemExit('Could not patch spring-server networks in compose')
    tail = 'networks:\n  smart-product-next-net:\n    name: smart-product-next-net\n'
    if tail in ns:
        ns = ns.replace(tail, tail + f'  {net}:\n    external: true\n', 1)
    else:
        ns += f'\nnetworks:\n  {net}:\n    external: true\n'
    p.write_text(ns)
PY
  else
    echo "Skip persistent compose patch; python3 or compose file missing. Temporary network connect will be attempted after Spring starts."
  fi
elif [ "$ENABLE_BACKEND_AI" != "true" ]; then
  echo "Backend AI configuration was not changed (set ENABLE_BACKEND_AI=true to opt in)."
fi

echo "RAGFlow containers:"
docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" "${COMPOSE_FILES[@]}" ps

echo "RAGFlow health URL: http://127.0.0.1:9380/api/v1/system/healthz"
echo "RAGFlow UI via SSH tunnel: ssh -L 19080:127.0.0.1:19080 root@SERVER_IP, then open http://127.0.0.1:19080"
echo "Backend RAGFlow URL (only after explicit AI opt-in): RAGFLOW_BASE_URL=http://ragflow-cpu:9380"
