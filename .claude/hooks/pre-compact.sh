#!/bin/bash
#
# pre-compact.sh — PreCompact hook for Claude Code
#
# Runs before automatic or manual compaction. Injects critical context
# into stdout so it survives the compaction process.
#
# Without this, version constraints and key patterns can be summarized
# away during long sessions, causing the agent to forget critical rules.
#

cat <<'EOF'
CRITICAL CONTEXT — preserve through compaction:

Version constraints (NEVER violate):
- Strapi v4.22 (Entity Service API, numeric id, nested responses) — NOT v5
- Tailwind v3.4 (tailwind.config.ts) — NOT v4
- Next.js 15 (cache and next fetch options are mutually exclusive)

Key patterns:
- fetchAPI() auto-flattens. Raw fetch() does NOT — call flattenAttributes() manually.
- CACHE_TAGS constants only — never hardcode tag strings.
- revalidateTag() after every mutation in Server Actions.

Restrictions:
- No git operations. No .env modifications. No terraform changes.

Active work: check docs/plans/ for current plan state.
Previous session: check docs/plans/PROGRESS.md if it exists.
Skills: skill-suggest.sh auto-suggests relevant skills. Load with claude skills use <name>.
EOF

exit 0
