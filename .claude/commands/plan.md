---
disable-model-invocation: true
---

# Plan a Task

Use the **planner agent** to plan the following task.

## Task: $ARGUMENTS

Before invoking the planner, gather context:

1. Check `docs/plans/` for any existing plans related to this task (avoid duplicate planning)
2. Run `git branch --show-current` to confirm you're on the right branch
3. If the task mentions a Linear ticket, read the ticket details from the arguments

Then invoke the planner agent with the task description and any context you gathered.

If no task description was provided, ask the human what they want to plan before invoking the planner.
