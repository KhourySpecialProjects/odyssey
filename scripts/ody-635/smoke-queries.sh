#!/usr/bin/env bash
# ODY-635 smoke: replays every frontend Strapi query and curated write body against a v5 backend. Needs ODY635_TOKEN (full-access).
# Optional: STRAPI_URL (default http://localhost:1337), ODY635_WRITES=1 + ODY635_LOCK_USER_ID=<authorized-user id> for the lock round-trip.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
: "${ODY635_TOKEN:?set ODY635_TOKEN}"
CATALOG="$(mktemp)"
trap 'rm -f "$CATALOG"' EXIT

echo "-- capturing queries from the real request functions"
if ! (cd "$ROOT/frontend" && ODY635_CATALOG_OUT="$CATALOG" npx jest testing/contract/strapi-query-catalog.test.ts --silent >&2); then
  echo "FAIL  catalog capture (the Jest capture test failed)"
  exit 1
fi

node "$ROOT/scripts/ody-635/replay.mjs" "$CATALOG"
