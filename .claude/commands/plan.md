---
disable-model-invocation: true
---

# Plan a Task

Use the **planner agent** to plan the following task.

## Task: $ARGUMENTS

Before invoking the planner, gather context:

1. Check `docs/plans/` for any existing plans related to this task (avoid duplicate planning)
2. Run `git branch --show-current` to confirm you're on the right branch
3. If the argument looks like a Linear ticket ID (e.g. `ODY-123`, `ENG-42`), fetch it via `mcp__linear__get_issue` and also fetch its comments via `mcp__linear__list_comments`. Pass the full fetched content to the planner — do NOT ask the human to paste anything.

Then invoke the planner agent with the task description and any context you gathered.

If no task description was provided, ask the human what they want to plan before invoking the planner.
