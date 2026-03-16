#!/bin/bash
#
# create-linear-ticket.sh — Create a Linear ticket from audit findings
#
# Usage: scripts/create-linear-ticket.sh "TITLE" "DESCRIPTION" PRIORITY
#   PRIORITY: 1=urgent, 2=high, 3=medium, 4=low
#
# Requires: LINEAR_API_KEY, LINEAR_TEAM_ID, LINEAR_BUG_LABEL_ID
# Source these from .claude/.env before calling, or set in your environment.
#

TITLE="$1"
DESCRIPTION="$2"
PRIORITY="${3:-2}"

if [ -z "$TITLE" ] || [ -z "$DESCRIPTION" ]; then
    echo "Usage: $0 \"TITLE\" \"DESCRIPTION\" [PRIORITY]" >&2
    exit 1
fi

if [ -z "$LINEAR_API_KEY" ] || [ -z "$LINEAR_TEAM_ID" ] || [ -z "$LINEAR_BUG_LABEL_ID" ]; then
    echo "ERROR: LINEAR_API_KEY, LINEAR_TEAM_ID, and LINEAR_BUG_LABEL_ID must be set." >&2
    echo "To enable: copy .claude/.env.example to .claude/.env and fill in your values." >&2
    exit 1
fi

RESPONSE=$(curl -s -X POST https://api.linear.app/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: $LINEAR_API_KEY" \
    --data "$(jq -n \
        --arg title "$TITLE" \
        --arg desc "$DESCRIPTION" \
        --arg team "$LINEAR_TEAM_ID" \
        --arg label "$LINEAR_BUG_LABEL_ID" \
        --argjson priority "$PRIORITY" \
        '{query: "mutation IssueCreate { issueCreate(input: { title: \($title), description: \($desc), teamId: \($team), priority: \($priority), labelIds: [\($label)] }) { success issue { id identifier url } } }"}'
    )")

# Extract and print the issue URL
URL=$(echo "$RESPONSE" | jq -r '.data.issueCreate.issue.url // empty' 2>/dev/null)
IDENTIFIER=$(echo "$RESPONSE" | jq -r '.data.issueCreate.issue.identifier // empty' 2>/dev/null)
SUCCESS=$(echo "$RESPONSE" | jq -r '.data.issueCreate.success // false' 2>/dev/null)

if [ "$SUCCESS" = "true" ] && [ -n "$URL" ]; then
    echo "$IDENTIFIER $URL"
else
    echo "ERROR: Failed to create ticket." >&2
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE" >&2
    exit 1
fi
