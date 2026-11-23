---
name: odyssey-env-and-infra-off-limits
description: Never edit .env, credentials, terraform/, or docker-compose.yml — flag required env/infra changes as manual human steps in the plan instead.
metadata:
  type: feedback
---

Plans must never include tasks that edit `.env`, credential files, `terraform/`, or `docker-compose.yml`. When a design needs a new environment variable or infra change, write it as an explicit **Manual Steps (human)** checklist section in the plan file — exact var name, which files/environments it must be added to, and what happens if it's missing.

**Why:** CLAUDE.md restricts these paths, and the user reiterated it when scoping ODY-474. Infra changes go through a separate process outside the agent pipeline.

**How to apply:** Any plan whose design introduces a shared secret, webhook URL, or new service config. Always pair the manual step with a graceful-degradation story so the feature doesn't hard-fail when the var is absent (e.g. fall back to the existing TTL). See [[ody-474-stale-cache]].
