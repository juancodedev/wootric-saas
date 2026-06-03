#!/usr/bin/env bash
# ensure-infra.sh — Create/validate all Cloudflare infrastructure before deploy.
# Idempotent: safe to run multiple times.
# Outputs: sets env vars KV_CACHE_ID, KV_RATE_LIMIT_ID, KV_SESSIONS_ID
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
declare -A REQUIRED_KV=(
  ["KV_CACHE"]="wootric-cache"
  ["KV_RATE_LIMIT"]="wootric-rate-limit"
  ["KV_SESSIONS"]="wootric-sessions"
)
REQUIRED_QUEUES=("wootric-exports" "wootric-sync" "wootric-billing")
REQUIRED_R2_BUCKET="wootric-saas-exports"
CONFIG_FILE="wrangler.jsonc"

log() { echo "▸ $*"; }
ok()  { echo "✅ $*"; }
fail(){ echo "❌ $*"; exit 1; }

# ── 1. KV Namespaces ───────────────────────────────────────────────────────
log "Ensuring KV namespaces..."

# List all existing namespaces — extract JSON array from wrangler output
KV_JSON=$(npx wrangler kv namespace list 2>/dev/null | sed -n '/^\[/,$ p' || echo "[]")

for binding in "${!REQUIRED_KV[@]}"; do
  title="${REQUIRED_KV[$binding]}"

  # Find by title
  id=$(echo "$KV_JSON" | jq -r --arg t "$title" '.[] | select(.title == $t) | .id' 2>/dev/null || true)

  if [ -z "$id" ] || [ "$id" = "null" ]; then
    log "  Creating KV namespace '$title'..."
    output=$(npx wrangler kv namespace create "$title" 2>&1)
    # Parse 32-char hex ID from output
    id=$(echo "$output" | grep -oE '[a-f0-9]{32}' | head -1)
    if [ -z "$id" ]; then
      fail "Failed to create KV namespace '$title'. Output:\n$output"
    fi
    ok "  Created '$title' → $id"
  else
    ok "  Found '$title' → $id"
  fi

  # Export for downstream use
  export "${binding}_ID=${id}"
done

# ── 2. R2 Bucket ───────────────────────────────────────────────────────────
log "Ensuring R2 bucket '$REQUIRED_R2_BUCKET'..."
if npx wrangler r2 bucket info "$REQUIRED_R2_BUCKET" >/dev/null 2>&1; then
  ok "  R2 bucket exists"
else
  log "  Creating R2 bucket..."
  npx wrangler r2 bucket create "$REQUIRED_R2_BUCKET" 2>&1
  ok "  Created R2 bucket"
fi

# ── 3. Queues ──────────────────────────────────────────────────────────────
log "Ensuring queues..."
for queue in "${REQUIRED_QUEUES[@]}"; do
  created=false
  for attempt in 1 2 3; do
    if npx wrangler queues info "$queue" >/dev/null 2>&1; then
      ok "  Queue '$queue' exists"
      created=true
      break
    fi
    if [ "$attempt" -lt 3 ]; then
      log "  Creating queue '$queue' (attempt $attempt)..."
      npx wrangler queues create "$queue" 2>&1 && { created=true; break; } || sleep 5
    else
      log "  Creating queue '$queue' (attempt $attempt)..."
      npx wrangler queues create "$queue" 2>&1 && { created=true; break; } || fail "Failed to create queue '$queue'"
    fi
  done
done

# ── 4. Patch wrangler.jsonc with correct KV IDs ───────────────────────────
log "Patching $CONFIG_FILE with resolved KV IDs..."

node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));

const idMap = {
  KV_CACHE:      process.env.KV_CACHE_ID,
  KV_RATE_LIMIT: process.env.KV_RATE_LIMIT_ID,
  KV_SESSIONS:   process.env.KV_SESSIONS_ID,
};

config.kv_namespaces.forEach((ns) => {
  if (idMap[ns.binding]) ns.id = idMap[ns.binding];
});

fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, '\t') + '\n');
console.log('✅ $CONFIG_FILE patched');
" || fail "Failed to patch $CONFIG_FILE"

log "Infrastructure ready ✨"
