---
disable-model-invocation: true
---

# Implement a Plan

Use the **implementer agent** to execute an approved plan.

## Plan: $ARGUMENTS

Before invoking the implementer:

1. If no plan path was provided, find the most recently modified `*-plan.md` in `docs/plans/` and use that
2. Check if the plan has incomplete tasks (`- [ ]`). If all tasks are already done, tell the human and stop
3. Check `git diff --stat` to see if there are uncommitted changes that might conflict
4. Read the first 5 lines of the plan to confirm it's the right one, then pass it to the implementer

After the implementer finishes a chunk, suggest: "Run `/review` to check the work, or `/implement` to continue with the next chunk."
