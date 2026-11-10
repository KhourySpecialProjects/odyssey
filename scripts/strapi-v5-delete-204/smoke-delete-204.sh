#!/usr/bin/env bash
# Smoke: Strapi v5 core DELETE returns 204 with an empty body. Needs DELETE204_TOKEN; run against a local scratch DB only (e.g. ody597).
set -u
BASE="${STRAPI_URL:-http://localhost:1337}"
: "${DELETE204_TOKEN:?set DELETE204_TOKEN}"
FAILS=0
TMP="$(mktemp)"
DOC=""

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1 ($2)"; FAILS=$((FAILS + 1)); }

# req METHOD PATH [JSON]: sets CODE, SIZE and BODY (body bytes kept in $TMP).
req() {
  local out
  out="$(curl -sg -o "$TMP" -w '%{http_code} %{size_download}' -X "$1" "$BASE$2" \
    -H "Authorization: Bearer $DELETE204_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Strapi-Response-Format: v4" \
    ${3:+-d "$3"})"
  CODE="${out%% *}"
  SIZE="${out##* }"
  BODY="$(cat "$TMP")"
}

cleanup() {
  [[ -n "$DOC" ]] && req DELETE "/api/tags/$DOC" && echo "-- cleanup DELETE $DOC: HTTP $CODE"
  rm -f "$TMP"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

STAMP="delete204-smoke-$(date +%s)"
req POST /api/tags "$(jq -nc --arg n "$STAMP" '{data:{name:$n, slug:$n}}')"
DOC="$(jq -r '.data.documentId // empty' <<<"$BODY")"
if [[ -z "$DOC" ]]; then fail "create throwaway tag" "HTTP $CODE $BODY"; exit 1; fi
echo "-- created tag $DOC ($STAMP)"

req DELETE "/api/tags/$DOC"
if [[ "$CODE" == 204 && "$SIZE" == 0 ]]; then pass "DELETE returns 204 with a zero-byte body"; else fail "DELETE returns 204 with a zero-byte body" "HTTP $CODE, $SIZE bytes"; fi
[[ "$CODE" == 204 ]] && DOC_GONE=1 || DOC_GONE=0

req GET "/api/tags/$DOC"
if [[ "$CODE" == 404 ]]; then pass "deleted tag is gone (404)"; else fail "deleted tag is gone (404)" "HTTP $CODE"; fi

# Informational: records what Strapi does for a missing documentId.
req DELETE "/api/tags/$DOC"
echo "INFO  second DELETE of a missing documentId: HTTP $CODE, $SIZE bytes"
[[ "$DOC_GONE" == 1 ]] && DOC=""

echo "-- $FAILS failure(s)"
[[ "$FAILS" == 0 ]]
