---
disable-model-invocation: true
---

# Implement a Plan

Use the **implementer agent** to execute an approved plan.

## Plan: $ARGUMENTS

Before invoking the implementer:

1. If no plan path was provided, find the most recently modified `.md` in `docs/plans/` that is NOT `PROGRESS.md` and does NOT end in `-audit.md` — that is the active plan
2. Check if the plan has incomplete tasks (`- [ ]`). If all tasks are already done, tell the human and stop
3. Check `git diff --stat` to see if there are uncommitted changes that might conflict
4. Read the first 5 lines of the plan to confirm it's the right one
5. If Linear MCP is available, create a Task sub-issue in Linear for each incomplete task in the plan (parent = the ticket ID from the filename, e.g. `ODY-342`). Use `mcp__linear__save_issue` with the full task block as the description. Skip silently if Linear MCP is unavailable.

Then invoke the implementer with the plan path.

After the implementer finishes a chunk, suggest: "Run `/review` to check the work, or `/implement` to continue with the next chunk."
