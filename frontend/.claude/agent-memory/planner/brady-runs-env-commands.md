---
name: brady-runs-env-commands
description: Agents can't read .env/.env.local, so any step needing Strapi tokens or ANTHROPIC_API_KEY (snapshots, paid evals) is Brady's to run; plans must name those steps and give exact commands
metadata:
  type: feedback
---

Agents can't read `.env` or `.env.local`. Anything that needs them (Strapi snapshots via `STRAPI_ACCESS_TOKEN`, paid Claude runs via `ANTHROPIC_API_KEY`) is run by Brady, not the implementer.

**Why:** stated by Brady while planning ODY-885 (Mentor eval); secrets stay out of agent context.

**How to apply:** in plans, mark such tasks "(Brady runs)", give the exact command from `frontend/` (e.g. `npx tsx --env-file=.env.local …`), and keep agent tasks to free, env-less work (Jest, case checks, review docs). Paid runs also sit behind explicit pauses for Brady's yes — see [[eval-pauses]].
