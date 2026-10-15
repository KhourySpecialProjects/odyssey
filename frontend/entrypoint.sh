#!/bin/sh
set -e

export INFISICAL_TOKEN=$(infisical login \
  --method=universal-auth \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --plain --silent)

exec infisical run --projectId="$INFISICAL_PROJECT_ID" --env=prod -- "$@"
