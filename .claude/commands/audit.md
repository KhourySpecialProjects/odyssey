---
disable-model-invocation: true
---

# Audit Feature Branch

Use the **auditor agent** to audit the current feature branch.

## Scope: $ARGUMENTS

Before invoking the auditor:

1. Run `git diff production --stat` to confirm there are changes to audit
2. If the diff is empty, tell the human (likely on wrong branch or already merged) and stop
3. Find the active plan in `docs/plans/` to pass as context
4. Warn the human: "This uses opus and spawns multiple subagents — it's the most expensive operation"

ONLY invoke the auditor after all implementation and review cycles are complete. For mid-development checks, suggest `/review` instead.
