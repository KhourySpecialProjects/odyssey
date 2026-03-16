# Odyssey — Agent Workflow

> For project conventions, version constraints, and core patterns, see `CLAUDE.md`.
> For agent implementation details, see `.claude/agents/*.md`.
> This file documents the **workflow** — when to use which agent, how state flows between them, and what to do when things break.

## The Six Agents

| Agent            | When to invoke                         | What it produces                                   |
| ---------------- | -------------------------------------- | -------------------------------------------------- |
| **brainstormer** | Before planning non-trivial features   | Design brief (intent, constraints, alternatives)   |
| **planner**      | After brainstorming or for clear tasks | `docs/plans/<slug>-spec.md` + `<slug>-plan.md`     |
| **implementer**  | After plan is approved                 | Code, tests, updated plan with completion status   |
| **reviewer**     | After each implementation chunk        | Prioritized findings (critical/warning/suggestion) |
| **auditor**      | Feature branch complete, before merge  | `docs/plans/<slug>-audit.md` with verdict          |
| **wrap-up**      | End of every working session           | Learnings, progress file, bloat pruning            |

## The Workflow

```
                   ┌─────────────┐
                   │   You have   │
                   │   a task     │
                   └──────┬──────┘
                          │
                          ▼
               ┌──────────────────────┐
               │  Is it trivial?       │
               │  (single file, style, │
               │   quick bug fix)      │
               └───┬──────────────┬───┘
                   │              │
                 yes              no
                   │              │
                   ▼              ▼
            Just ask         ┌──────────────┐
            Claude           │ Brainstormer │ (optional but recommended)
            directly         └──────┬───────┘
                                    │ design brief
                                    ▼
                             ┌──────────┐
                             │ Planner  │
                             └────┬─────┘
                                  │ writes spec + plan
                                  ▼
                          ┌──────────────┐
                          │ Human review │──── needs changes ──→ re-invoke planner
                          └──────┬───────┘
                                 │ approved
                                 ▼
                          ┌──────────────┐
                     ┌──→ │ Implementer  │ ◄── works in 2-4 task chunks
                     │    └──────┬───────┘
                     │           │ chunk complete
                     │           ▼
                     │    ┌──────────────┐
                     │    │  Reviewer    │
                     │    └──────┬───────┘
                     │           │
                     │    has findings? ──yes──→ implementer fixes them
                     │           │                     │
                     │           no                     │
                     │           │                      │
                     │    more tasks? ──yes─────────────┘
                     │           │
                     │           no
                     │           ▼
                     │    ┌──────────────┐
                     │    │   Auditor    │ (only for non-trivial features)
                     │    └──────┬───────┘
                     │           │
                     │    verdict?
                     │     ├── APPROVE → ready to merge
                     │     ├── CONDITIONS → implementer fixes → re-audit
                     │     └── BLOCK → implementer fixes → re-audit
                     │
                     └── At end of session: wrap-up agent
```

## State Passing

Agents run in isolated context windows. They share state through files, not memory.

| Handoff                | Mechanism                                                                        |
| ---------------------- | -------------------------------------------------------------------------------- |
| Brainstormer → Planner | Human passes design brief to planner prompt (brainstormer saves nothing to disk) |
| Planner → Implementer  | Implementer reads `docs/plans/<slug>-plan.md`                                    |
| Implementer → Reviewer | Reviewer reads the code directly + the plan file                                 |
| Reviewer → Implementer | Human pastes findings into implementer prompt, or reviewer appends to plan file  |
| All → Auditor          | Auditor reads `git diff production` + the plan file                              |
| All → Wrap-up          | Wrap-up reads `git log`, `git diff --stat`, and `docs/plans/`                    |
| Wrap-up → Next session | Wrap-up writes `docs/plans/PROGRESS.md`, session-start.sh injects it             |

If an agent needs information from a previous agent's session, it must be in a file. There is no shared memory between agents. This is intentional — it prevents context rot and ensures the reviewer isn't biased by watching the implementer work.

## Invocation Syntax

Each agent is invoked by asking Claude Code to use it:

```
"Use the brainstormer agent to explore [task description]"
"Use the planner agent to plan [task description]"
"Use the implementer agent to execute docs/plans/<slug>-plan.md"
"Use the reviewer agent to review the latest changes"
"Use the auditor agent to audit the changes on this branch"
"Use the wrap-up agent"
```

The `suggest-next.sh` hook automatically suggests the next agent after each subagent completes, based on the state of `docs/plans/`.

## Decision Guide

### When to use agents vs. just ask

| Use the agent workflow           | Just ask Claude directly           |
| -------------------------------- | ---------------------------------- |
| New features (any size)          | Quick bug fixes (< 30 min)         |
| Multi-file refactors             | Single-file style or copy changes  |
| Auth, caching, data model work   | Codebase questions or explanations |
| Anything touching Strapi schemas | Adding a test for existing code    |
| Want a plan→review audit trail   | Config or tooling changes          |

### When to use reviewer vs. auditor

The reviewer checks individual files against the plan during development. The auditor checks how all changes interact together before merge.

Use the **reviewer** after each implementation chunk (2-4 tasks). It reads changed files and reports findings by severity. You triage which findings the implementer should fix. Use it multiple times per feature.

Use the **auditor** once, after all implementation is complete and reviewer findings are resolved. It spawns 3-4 investigator subagents (data flow, regressions, security, test coverage) plus a devil's advocate validator that tries to disprove each finding. Only confirmed findings appear in the audit report. The auditor issues a verdict: APPROVE, APPROVE WITH CONDITIONS, or BLOCK.

### When to use the planner's explore subagents

The planner spawns lightweight explore subagents for codebase research. Each runs in a fresh context, investigates one question, and returns a summary. This keeps the planner's context clean for decision-making.

Use explore subagents when: the task touches multiple directories, you need to trace a data flow across files, or the scope is unclear. Skip them for: small single-component tasks, tasks where a quick grep answers the question, or when you already know exactly which files are involved.

For design rationale and troubleshooting, see `docs/agent/workflow.md`.
