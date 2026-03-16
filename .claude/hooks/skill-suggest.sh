#!/bin/bash
#
# skill-suggest.sh — UserPromptSubmit hook for Claude Code
#
# Analyzes the user's prompt and suggests relevant skills before
# Claude responds. Low-overhead keyword matching (~<50ms).
#
# Output to stderr = shown to user as suggestion.
# Exit 0 = always allow (never block prompts).
#

# Read JSON from stdin (hooks receive event data on stdin, not env vars)
INPUT=$(cat)
USER_INPUT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)

# Lowercase for matching
INPUT_LOWER=$(echo "$USER_INPUT" | tr '[:upper:]' '[:lower:]')

SUGGESTIONS=""

# ─── Debugging / Bug patterns ────────────────────────────────────────
if echo "$INPUT_LOWER" | grep -qE 'bug|debug|fix|error|broken|failing|crash|undefined|null|trace|stack|hydration|mismatch|stale'; then
    SUGGESTIONS="${SUGGESTIONS}\n  Skill: systematic-debugging — 4-phase root cause process"
fi

# ─── Schema / content type changes ───────────────────────────────────
if echo "$INPUT_LOWER" | grep -qE 'schema|content.?type|field|relation|strapi.*add|strapi.*remove|add.*field|remove.*field|migration'; then
    SUGGESTIONS="${SUGGESTIONS}\n  Skill: schema-change-checklist — 8-step ripple effect checklist"
fi

# ─── Strapi / backend API work ───────────────────────────────────────
if echo "$INPUT_LOWER" | grep -qE 'strapi|entity.?service|populate|filter|query|endpoint|api.*route|backend.*api'; then
    SUGGESTIONS="${SUGGESTIONS}\n  Skill: strapi-v4-patterns — query building, schemas, gotchas"
fi

# ─── React / component work ─────────────────────────────────────────
if echo "$INPUT_LOWER" | grep -qE 'component|server.?component|client.?component|suspense|error.?boundary|use.?client|use.?server|layout|page.*route|zustand|form'; then
    SUGGESTIONS="${SUGGESTIONS}\n  Skill: react-patterns — Server/Client Components, Suspense, forms"
fi

# ─── Testing ─────────────────────────────────────────────────────────
if echo "$INPUT_LOWER" | grep -qE 'test|jest|mock|assert|expect|tdd|coverage|testing'; then
    SUGGESTIONS="${SUGGESTIONS}\n  Skill: testing-patterns — Jest mocks, RTL, mock data conventions"
fi

# ─── Data fetching / caching ─────────────────────────────────────────
if echo "$INPUT_LOWER" | grep -qE 'fetch|cache|revalidate|stale|invalidat|cache.?tag|data.?fetch|request.?function'; then
    SUGGESTIONS="${SUGGESTIONS}\n  Skill: data-fetching — fetchAPI, cache tags, invalidation"
fi

# ─── Output suggestions ──────────────────────────────────────────────
if [ -n "$SUGGESTIONS" ]; then
    echo "Relevant skills for this task:" >&2
    echo -e "$SUGGESTIONS" >&2
    echo "  Load with: claude skills use <name>" >&2
fi

exit 0
