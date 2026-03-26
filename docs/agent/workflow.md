# Agent Workflow — Design Rationale & Troubleshooting

> For the workflow itself, see `AGENTS.md` in the project root.
> This file contains background context — read it when debugging agent issues.

## Design Rationale

**Why fresh context per agent?** The reviewer isn't biased by watching the implementer struggle. The implementer fixing review findings doesn't carry assumptions from the first attempt. Fresh context produces better output than accumulated context for review and audit tasks.

**Why sequential by default, with optional parallel?** Most Odyssey tasks touch both frontend and backend with shared types. The default workflow is sequential to avoid semantic conflicts (e.g., two agents modifying the same TypeScript type). However, the implementer agent uses `isolation: worktree` so it can run in a separate local worktree. This means you can run a planner in terminal A while an implementer works in terminal B without file conflicts — the implementer gets its own copy of the repo. Read-only agents (reviewer, auditor investigators) can always run in parallel safely.

**Why human-in-the-loop between every stage?** Odyssey is a university platform with multiple contributors. Auditable, repeatable workflows matter more than speed. A new team member can read this file and understand exactly what happens at each stage.

## Troubleshooting

| Symptom                                      | Likely cause                                   | Fix                                                                              |
| -------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Reviewer can't find plan file                | Planner wrote to wrong path or was interrupted | Check `docs/plans/` — rerun planner if empty                                     |
| Auditor `git diff production` returns empty  | Already merged or wrong branch                 | `git log --oneline -5` to verify feature branch                                  |
| Implementer says "plan is unclear"           | Planner left ambiguity                         | Re-invoke planner with the specific question                                     |
| `suggest-next.sh` gives wrong suggestion     | Stale plan files or wrong branch               | Check `docs/plans/` and `git branch`                                             |
| Hook blocks a legitimate edit                | `protect-files.sh` pattern too broad           | Check `.claude/hooks/protect-files.sh`                                           |
| Agent keeps failing same lint error          | Runaway detection triggers after 3             | Read the error, fix manually, resume                                             |
| Superpowers skill activates instead of agent | CLAUDE.md override not loaded                  | Restart Claude Code; verify Superpowers section in CLAUDE.md                     |
| Agent runs out of context mid-task           | Task too large for one invocation              | Agent should write progress to plan file and stop cleanly; re-invoke to continue |
