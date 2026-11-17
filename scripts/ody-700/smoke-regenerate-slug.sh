#!/usr/bin/env bash
# ODY-700 smoke: regenerateSlug in PUT bodies on droplets/lessons/playlists. Needs ODY700_TOKEN; run against the ody597 scratch DB only.
set -u
BASE="${STRAPI_URL:-http://localhost:1337}"
: "${ODY700_TOKEN:?set ODY700_TOKEN}"
FAILS=0
BODIES="$(mktemp)"
trap 'rm -f "$BODIES"' EXIT

pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1 ($2)"; FAILS=$((FAILS + 1)); }

# req METHOD PATH [JSON]: sets CODE and BODY; keeps every response for the leak check.
req() {
  local out
  out="$(curl -sg -w $'\n%{http_code}' -X "$1" "$BASE$2" \
    -H "Authorization: Bearer $ODY700_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Strapi-Response-Format: v4" \
    ${3:+-d "$3"})"
  CODE="${out##*$'\n'}"
  BODY="${out%$'\n'*}"
  printf '%s\n' "$BODY" >> "$BODIES"
}

slug_of() { jq -r '.data.attributes.slug // .data.slug' <<<"$BODY"; }

# Restore PUT for the entry in progress; INT/TERM replays it.
PEND_URL="" PEND_BODY=""
on_signal() {
  echo "-- interrupted; restoring ${PEND_URL:-nothing}"
  if [[ -n "$PEND_URL" ]]; then req PUT "$PEND_URL" "$PEND_BODY"; echo "restore HTTP $CODE"; fi
  exit 130
}
trap on_signal INT TERM

# Lesson name has maxLength 100; leave room for " ody700".
BASE_MAX=93

for TYPE in droplets lessons playlists; do
  req GET "/api/$TYPE?pagination[pageSize]=1&fields[0]=name&fields[1]=slug&fields[2]=documentId"
  DOC="$(jq -r '.data[0].documentId' <<<"$BODY")"
  NAME="$(jq -r '.data[0].attributes.name // .data[0].name' <<<"$BODY")"
  SLUG="$(jq -r '.data[0].attributes.slug // .data[0].slug' <<<"$BODY")"
  if [[ -z "$DOC" || "$DOC" == null ]]; then fail "$TYPE pick entry" "GET $CODE"; continue; fi
  if [[ -z "$NAME" || "$NAME" == null || -z "$SLUG" || "$SLUG" == null ]]; then fail "$TYPE pick entry" "null or empty name/slug on $DOC"; continue; fi
  URL="/api/$TYPE/$DOC"
  echo "-- $TYPE $DOC original: $(jq -nc --arg n "$NAME" --arg s "$SLUG" '{name:$n,slug:$s}')"
  if [[ "$NAME" == *ody700* || "$SLUG" == *ody700* ]]; then fail "$TYPE pick entry" "already contains ody700 (dirty earlier run); restore $DOC manually"; continue; fi

  RESTORE_BODY="$(jq -nc --arg n "$NAME" --arg s "$SLUG" '{data:{name:$n, slug:$s}}')"
  PEND_URL="$URL" PEND_BODY="$RESTORE_BODY"

  req PUT "$URL" "$(jq -nc --arg n "$NAME" '{data:{name:$n, regenerateSlug:false}}')"
  if [[ "$CODE" == 200 && "$(slug_of)" == "$SLUG" ]]; then pass "$TYPE regenerateSlug=false keeps slug"; else fail "$TYPE regenerateSlug=false keeps slug" "HTTP $CODE $(jq -c '.error.message // empty' <<<"$BODY")"; fi

  req PUT "$URL" "$(jq -nc --arg n "$NAME" '{data:{name:$n}}')"
  if [[ "$CODE" == 200 && "$(slug_of)" == "$SLUG" ]]; then pass "$TYPE key omitted keeps slug"; else fail "$TYPE key omitted keeps slug" "HTTP $CODE $(jq -c '.error.message // empty' <<<"$BODY")"; fi

  NEWNAME="$(jq -nr --arg n "$NAME" --argjson m "$BASE_MAX" '$n[0:$m] + " ody700"')"
  req PUT "$URL" "$(jq -nc --arg n "$NEWNAME" '{data:{name:$n, regenerateSlug:true}}')"
  NEWSLUG="$(slug_of)"
  if [[ "$CODE" == 200 && "$NEWSLUG" != "$SLUG" && "$NEWSLUG" == *ody700* ]]; then pass "$TYPE regenerateSlug=true regenerates slug ($NEWSLUG)"; else fail "$TYPE regenerateSlug=true regenerates slug" "HTTP $CODE slug=$NEWSLUG $(jq -c '.error.message // empty' <<<"$BODY")"; fi
  if [[ -n "${ODY700_PAUSE:-}" ]]; then echo "-- pausing ${ODY700_PAUSE}s"; sleep "$ODY700_PAUSE" & wait $!; fi

  req PUT "$URL" "$(jq -nc --arg n "$NAME" '{data:{name:$n, regenerateSlug:"yes"}}')"
  if [[ "$CODE" == 400 && "$(jq -r '.error.details.param // empty' <<<"$BODY")" == regenerateSlug && "$BODY" != *"Invalid key"* ]]; then pass "$TYPE regenerateSlug=\"yes\" rejected by Zod"; else fail "$TYPE regenerateSlug=\"yes\" rejected by Zod" "HTTP $CODE $(jq -c '.error // empty' <<<"$BODY")"; fi

  # AC1c: the rejected PUT must not have written anything.
  req GET "$URL?fields[0]=name&fields[1]=slug"
  if [[ "$CODE" == 200 && "$(slug_of)" == "$NEWSLUG" ]]; then pass "$TYPE rejected PUT wrote nothing"; else fail "$TYPE rejected PUT wrote nothing" "HTTP $CODE slug=$(slug_of)"; fi

  # Restore the full original name and slug.
  req PUT "$URL" "$RESTORE_BODY"
  if [[ "$CODE" == 200 && "$(slug_of)" == "$SLUG" ]]; then pass "$TYPE restored original name and slug"; PEND_URL="" PEND_BODY=""; else fail "$TYPE restored original name and slug" "HTTP $CODE"; fi
done

echo "-- scoping controls"
req POST "/api/droplets" '{"data":{"name":"ody700-control","regenerateSlug":false}}'
if [[ "$CODE" == 400 && "$BODY" == *"Invalid key regenerateSlug"* ]]; then pass "POST /droplets still rejects regenerateSlug"; else fail "POST /droplets still rejects regenerateSlug" "HTTP $CODE"; fi

req GET "/api/tags?pagination[pageSize]=1&fields[0]=name&fields[1]=documentId"
TDOC="$(jq -r '.data[0].documentId' <<<"$BODY")"
TNAME="$(jq -r '.data[0].attributes.name // .data[0].name' <<<"$BODY")"
req PUT "/api/tags/$TDOC" "$(jq -nc --arg n "$TNAME" '{data:{name:$n, regenerateSlug:false}}')"
if [[ "$CODE" == 400 && "$BODY" == *"Invalid key regenerateSlug"* ]]; then pass "PUT /tags still rejects regenerateSlug"; else fail "PUT /tags still rejects regenerateSlug" "HTTP $CODE"; fi

echo "-- response bodies"
# Only success bodies (with .data) are checked; error bodies may name the rejected key.
jq -se 'any(.[]; .data != null and (tojson | contains("regenerateSlug")))' "$BODIES" >/dev/null
JQ_RC=$?
case "$JQ_RC" in
  0) fail "no regenerateSlug in success bodies" "found" ;;
  1) pass "no regenerateSlug in success bodies" ;;
  *) fail "no regenerateSlug in success bodies" "jq error (exit $JQ_RC)" ;;
esac

if [[ "$FAILS" -gt 0 ]]; then echo "$FAILS FAILED"; exit 1; fi
echo "ALL PASSED"
