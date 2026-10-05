---
name: dependabot-default-branch
description: Dependabot config is only read from the repo default branch (production); target-branch entries for feature/strapi-v5 need a develop->production release to activate
metadata:
  type: project
---

The repo's default branch is `production` (origin/HEAD), not `develop`. Dependabot reads `.github/dependabot.yml` only from there, and its security updates only ever target the default branch. Found during ODY-701 planning on 2026-10-05.

**Why:** if you edit dependabot.yml on a feature branch (e.g. to cover `feature/strapi-v5`), nothing happens until that change reaches `production`.
**How to apply:** for alert coverage on integration branches, prefer a manual `npm audit`-at-merge step. Any dependabot.yml change has to go through develop → production. Related: [[strapi-v5-branching]].
