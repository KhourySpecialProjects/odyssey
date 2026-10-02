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

slugify() { jq -nr --arg s "$1" '$s | ascii_downcase | gsub("[^a-z0-9]+"; "-") | sub("^-"; "") | sub("-$"; "")'; }
slug_of() { jq -r '.data.attributes.slug // .data.slug' <<<"$BODY"; }

for TYPE in droplets lessons playlists; do
  req GET "/api/$TYPE?pagination[pageSize]=1&fields[0]=name&fields[1]=slug&fields[2]=documentId"
  DOC="$(jq -r '.data[0].documentId' <<<"$BODY")"
  NAME="$(jq -r '.data[0].attributes.name // .data[0].name' <<<"$BODY")"
  SLUG="$(jq -r '.data[0].attributes.slug // .data[0].slug' <<<"$BODY")"
  if [[ -z "$DOC" || "$DOC" == null ]]; then fail "$TYPE pick entry" "GET $CODE"; continue; fi
  URL="/api/$TYPE/$DOC"
  echo "-- $TYPE $DOC (slug: $SLUG)"

  req PUT "$URL" "$(jq -nc --arg n "$NAME" '{data:{name:$n, regenerateSlug:false}}')"
  if [[ "$CODE" == 200 && "$(slug_of)" == "$SLUG" ]]; then pass "$TYPE regenerateSlug=false keeps slug"; else fail "$TYPE regenerateSlug=false keeps slug" "HTTP $CODE $(jq -c '.error.message // empty' <<<"$BODY")"; fi

  req PUT "$URL" "$(jq -nc --arg n "$NAME" '{data:{name:$n}}')"
  if [[ "$CODE" == 200 && "$(slug_of)" == "$SLUG" ]]; then pass "$TYPE key omitted keeps slug"; else fail "$TYPE key omitted keeps slug" "HTTP $CODE $(jq -c '.error.message // empty' <<<"$BODY")"; fi

  NEWNAME="$NAME ody700"
  req PUT "$URL" "$(jq -nc --arg n "$NEWNAME" '{data:{name:$n, regenerateSlug:true}}')"
  NEWSLUG="$(slug_of)"
  if [[ "$CODE" == 200 && "$NEWSLUG" != "$SLUG" && "$NEWSLUG" == "$(slugify "$NEWNAME")"* ]]; then pass "$TYPE regenerateSlug=true regenerates slug ($NEWSLUG)"; else fail "$TYPE regenerateSlug=true regenerates slug" "HTTP $CODE slug=$NEWSLUG $(jq -c '.error.message // empty' <<<"$BODY")"; fi

  req PUT "$URL" "$(jq -nc --arg n "$NAME" '{data:{name:$n, regenerateSlug:"yes"}}')"
  if [[ "$CODE" == 400 ]]; then pass "$TYPE regenerateSlug=\"yes\" rejected"; else fail "$TYPE regenerateSlug=\"yes\" rejected" "HTTP $CODE"; fi

  # Restore the original name and slug.
  req PUT "$URL" "$(jq -nc --arg n "$NAME" --arg s "$SLUG" '{data:{name:$n, slug:$s}}')"
  if [[ "$CODE" == 200 && "$(slug_of)" == "$SLUG" ]]; then pass "$TYPE restored original name and slug"; else fail "$TYPE restored original name and slug" "HTTP $CODE"; fi
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
if jq -se 'any(.[]; .data != null and (tojson | contains("regenerateSlug")))' "$BODIES" >/dev/null; then fail "no regenerateSlug in success bodies" "found"; else pass "no regenerateSlug in success bodies"; fi

if [[ "$FAILS" -gt 0 ]]; then echo "$FAILS FAILED"; exit 1; fi
echo "ALL PASSED"
