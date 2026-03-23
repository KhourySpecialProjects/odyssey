# Agent Learnings

Accumulated knowledge from wrap-up sessions. Shared across the team via git.

## How This Works

The wrap-up agent writes learnings here — not in the reference docs. Reference
docs (`docs/agent/*.md`) describe how the system works. This folder describes
what we've learned about how it breaks.

## Lifecycle

Learnings have a natural lifecycle:

1. **New** — Discovered this session, written by wrap-up agent
2. **Validated** — Confirmed across multiple sessions or by multiple team members
3. **Promoted** — Important enough to update `CLAUDE.md` or a reference doc (`docs/agent/*.md`)
4. **Archived** — No longer relevant (dependency updated, code changed, etc.)

## Pruning

This folder is pruned monthly. During pruning:
- Learnings that were promoted are deleted (they live elsewhere now)
- Learnings older than 2 months with no validation are archived or deleted
- The goal is to keep this folder under 20 files at all times

## Format

Each learning is a single markdown file named with a date prefix:

```
learnings/
├── 2026-03-06-fetchapi-swallows-404s.md
├── 2026-03-06-cache-next-mutual-exclusion.md
├── 2026-03-10-enrollment-rating-needs-5-minimum.md
└── ...
```

Each file follows this template:

```markdown
# [Short description]
Date: [YYYY-MM-DD]
Author: [who discovered this]
Status: new | validated | promoted | archived

## What we learned
[1-3 sentences]

## Why it matters
[1-2 sentences on impact]

## Evidence
[file path, error message, or reproduction steps]
```
