---
disable-model-invocation: true
---

# Review Changes

Use the **reviewer agent** to review the latest implementation work.

## Focus: $ARGUMENTS

Before invoking the reviewer:

1. Run `git diff --name-only` to identify what files changed
2. Find the active plan in `docs/plans/` (most recently modified `.md` that is NOT `PROGRESS.md` and does NOT end in `-audit.md`)
3. If no files have changed, tell the human there's nothing to review

Pass both the changed file list and the plan path to the reviewer agent.

After the review, suggest: "To fix findings, run `/implement fix these findings: [paste critical items]`"
