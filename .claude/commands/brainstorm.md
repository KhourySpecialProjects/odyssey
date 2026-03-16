---
disable-model-invocation: true
---

# Brainstorm a Task

Use the **brainstormer agent** to explore the following task before planning.

## Task: $ARGUMENTS

Before invoking the brainstormer, gather quick context:

1. Check `docs/plans/` for any existing plans related to this task (avoid duplicate work)
2. Run `git branch --show-current` to confirm you're on the right branch

Then invoke the brainstormer agent with the task description.

If no task description was provided, ask the human what they want to explore before invoking the brainstormer.

After the brainstormer produces a design brief, suggest: "Ready to plan? Run `/plan [task]` and reference this design brief."
