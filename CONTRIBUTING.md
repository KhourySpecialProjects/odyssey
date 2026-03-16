# Contributing to Odyssey with Claude Code

This guide explains the Claude Code development workflow used on Odyssey. Read this before your first session.

## Quick Start

```bash
# Start Claude Code in the project root
claude

# For a quick fix (typo, style, small bug):
Just describe the task. Claude handles it directly.

# For a feature or non-trivial change:
/plan [task description]
```

That's it for the basics. Everything below explains what happens under the hood.

## Commands

| Command              | When to use                                | What it does                                                         |
| -------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `/brainstorm [task]` | Before planning non-trivial features       | Explores intent, constraints, alternatives. Produces a design brief. |
| `/plan [task]`       | Starting any feature, bug fix, or refactor | Writes a spec + implementation plan to `docs/plans/`.                |
| `/implement`         | After a plan is approved                   | Executes the plan. Writes code and tests using TDD.                  |
| `/review`            | After each implementation chunk            | Reviews code against the plan. Reports findings by severity.         |
| `/audit`             | Feature branch complete, before merge      | Full cross-cutting audit. Expensive — use once per feature.          |
| `/ship`              | Ready to push                              | Runs CI, generates PR summary, verifies branch is ready.             |
| `/ci`                | Anytime                                    | Runs Prettier + ESLint + Jest + builds locally.                      |
| `/ci quick`          | Quick check                                | Same as `/ci` but skips builds.                                      |

### Command Details

All commands use `disable-model-invocation: true` — they're dispatch templates that gather context first, then invoke the right agent.

- **`/brainstorm`** — Checks `docs/plans/` for duplicate work, confirms branch, invokes brainstormer agent
- **`/plan`** — Checks for existing plans, detects Linear ticket format in arguments, invokes planner agent
- **`/implement`** — Finds most recent plan if no path given, checks for incomplete tasks, invokes implementer agent
- **`/review`** — Runs `git diff --name-only`, finds active plan, invokes reviewer agent
- **`/audit`** — Runs `git diff production --stat`, warns about cost, invokes auditor agent
- **`/ship`** — Runs full CI via `scripts/ci-local.sh`, gathers branch context, generates PR description. Does NOT push.
- **`/ci`** — Runs prettier → lint → tests → builds sequentially. Truncates noisy output. Reports structured verdict.

## The Workflow

### For quick tasks

```
Describe the task → Claude fixes it → Done
```

Formatting runs automatically after every change. File protection prevents accidental edits to `.env`, `terraform/`, and lock files.

### For features and non-trivial changes

```
/brainstorm [task]     Optional — explore the problem space
        ↓
/plan [task]           Writes spec + plan to docs/plans/
        ↓
  You review plan      Approve or ask for changes
        ↓
/implement             Writes code + tests in chunks
        ↓
/review                Checks code against plan, reports findings
        ↓
  You triage findings  Decide what to fix
        ↓
/implement             Fix findings → /review again → cycle until clean
        ↓
/audit                 Cross-cutting audit (once, when done)
        ↓
/ship                  Run CI, generate PR description
        ↓
  You push manually    Claude never pushes
```

You're in the loop between every step. Agents share state through files in `docs/plans/`, not through conversation memory. After each agent finishes, the system suggests the next step automatically.

## The Six Agents

| Agent            | What it does                                                          | Model  | Can modify code?       |
| ---------------- | --------------------------------------------------------------------- | ------ | ---------------------- |
| **Brainstormer** | Explores the problem. Asks questions, presents options.               | Opus   | No                     |
| **Planner**      | Writes spec + implementation plan. Spawns research subagents.         | Opus   | No (writes plans only) |
| **Implementer**  | Executes the plan. Writes code and tests. Works in isolated worktree. | Sonnet | Yes                    |
| **Reviewer**     | Reviews implementation against the plan. Prioritized findings.        | Opus   | No                     |
| **Auditor**      | Audits the full changeset. Spawns investigators + a devil's advocate. | Opus   | No                     |
| **Wrap-up**      | End-of-session. Writes progress file, records learnings.              | Sonnet | Yes                    |

### Agent Details

**Brainstormer** (`brainstormer.md`) — Read-only. Runs a Socratic discovery session: asks 1-3 targeted questions, greps the codebase to understand what exists, presents 2-3 approaches with tradeoffs (always includes a "minimal" option), converges into a design brief. Saves nothing to disk — the design brief lives in conversation only. Hard time cap: 4 exchanges max.

**Planner** (`planner.md`) — Can write to `docs/plans/` but cannot edit code. Scopes impact first with cheap grep/glob searches before asking questions. Spawns explore subagents for deep codebase research. Parses Linear tickets (bug template or feature template). Writes atomic tasks sized for fresh-context execution (1-3 files each), with dependency markers for parallel execution.

**Implementer** (`implementer.md`) — Full tools, runs in an isolated git worktree (can't corrupt your working tree). Uses Sonnet for speed/cost. Follows TDD: write test → verify fail → implement → verify pass. For plans with 4+ tasks, dispatches each as a subagent. Has its own PostToolUse hook running Prettier after every edit. Three-strikes rule: if blocked 3 times, stops and reports.

**Reviewer** (`reviewer.md`) — Read-only. Cannot modify any file. Reviews against a 6-point checklist: correctness, patterns, version compliance, security, accessibility, testing. Produces findings at 4 severity levels: Critical (must fix), Warning (should fix), Suggestion (consider), Observation (acknowledged smart deviation from plan). The human triages — reviewer never sends findings directly to implementer.

**Auditor** (`auditor.md`) — Most expensive agent (Opus, 60 turns). Runs only once per feature. Phase 1: scopes changeset via `git diff production`. Phase 2: spawns 3-4 investigator subagents (data flow tracer, regression scanner, security checker, test coverage checker). Phase 3: spawns a devil's advocate validator in fresh context that tries to disprove each finding. Phase 4: writes audit report with only CONFIRMED findings. Phase 5: creates Linear tickets for Critical/Warning findings if `LINEAR_API_KEY` is set. Issues a verdict: APPROVE / APPROVE WITH CONDITIONS / BLOCK.

**Wrap-up** (`wrap-up.md`) — Runs at session end. Writes `docs/plans/PROGRESS.md` so the next session can resume. Records learnings to `docs/agent/learnings/` with lifecycle tracking (new → validated → promoted → archived). Runs completeness checks (prettier, eslint, tests). Prunes stale learnings if folder exceeds 15 files. Hard limit: max 20 learning files.

### Key design decisions

- Each agent runs in **fresh context** — the reviewer never sees the implementer struggle, preventing bias.
- The implementer runs in an **isolated git worktree** — can't corrupt your working tree.
- Read-only agents (brainstormer, reviewer) **cannot edit files** at the tool level, not just by instruction.
- State passes through **files** (`docs/plans/*.md`), not memory. No agent is trusted to remember anything.

## Hooks

Nine shell scripts that run automatically at specific lifecycle events. They execute outside the model's context — Claude never sees the hook code, only the results.

### Session Lifecycle

| Hook               | Event        | What it does                                                                                                                                             |
| ------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session-start.sh` | SessionStart | Checks Docker status, flags incomplete plans in `docs/plans/`, injects branch/commit/plan context and `PROGRESS.md` into Claude's session                |
| `pre-compact.sh`   | PreCompact   | Re-injects critical version constraints (Strapi v4.22, Tailwind v3.4, Next.js 15 cache rules) into context before compaction so they survive compression |
| `notify.sh`        | Notification | Sends macOS notification when Claude needs attention (permission prompts, idle)                                                                          |

### Safety Guards

| Hook                          | Event                    | What it does                                                                                                                                          |
| ----------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protect-files.sh`            | PreToolUse (Edit\|Write) | Blocks writes to `.env*`, `docker-compose*.yml`, lock files, `terraform/*`, `.claude/settings.local.json`. Exit code 2 = blocked.                     |
| `block-dangerous-commands.sh` | PreToolUse (Bash)        | Blocks `git push`, `git merge`, `git rebase`, `git worktree`, `rm -rf /`, `npm publish`, pipe-to-bash, and 10+ other patterns. Exit code 2 = blocked. |

### Quality & Audit

| Hook              | Event               | What it does                                                                                                                |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `quality-gate.sh` | Stop + SubagentStop | Runs `prettier --write` on all changed files. Auto-fixes formatting silently. Does NOT run ESLint or tests. Always exits 0. |
| `audit-bash.sh`   | PostToolUse (Bash)  | Appends every executed bash command to `.claude/bash-audit.log` with timestamp. Full audit trail.                           |

### Workflow Guidance

| Hook               | Event            | What it does                                                                                                                                            |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `suggest-next.sh`  | SubagentStop     | Reads plan file checkboxes and suggests the next agent (e.g., "3 done, 2 remaining. Next: /implement or /review")                                       |
| `skill-suggest.sh` | UserPromptSubmit | Keyword-matches your prompt and suggests relevant skills before Claude responds (e.g., "fix cache bug" → suggests systematic-debugging + data-fetching) |

## Skills

Six domain-specific reference guides. Only `name` + `description` load at startup. Full content loads only when invoked, keeping context lean.

| Skill                     | What it provides                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `systematic-debugging`    | 4-phase root cause process with decision trees for Strapi, hydration, cache, and enrollment bugs              |
| `react-patterns`          | Server/Client component decisions, route structure, Suspense, forms, Zustand, auth, loading/error conventions |
| `testing-patterns`        | 4 mock patterns (fetchAPI, Server Actions, next-auth, next/navigation), RTL conventions, mock data rules      |
| `data-fetching`           | fetchAPI internals, CACHE_TAGS system (global + per-user), invalidation matrix, 7 common mistakes             |
| `strapi-v4-patterns`      | Query building with qs, Entity Service API patterns, populate/filter syntax, 6 gotchas                        |
| `schema-change-checklist` | 8-step ripple effect checklist ensuring all downstream files are updated when a schema changes                |

Every skill encodes Odyssey-specific knowledge. Generic patterns (WCAG, TDD methodology, React fundamentals) are intentionally excluded — refer to standard documentation or Claude's training for those.

## Rules (Auto-Activated)

Six path-conditional rules that activate automatically when Claude touches matching files. You never load them manually.

| Rule                | Activates when editing                      | Key guidance                                                        |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `cache-tags`        | `lib/cache-tags.ts`                         | Never hardcode tag strings                                          |
| `components`        | `frontend/components/**`, `frontend/app/**` | Server Components by default, `cn()` for classes                    |
| `request-functions` | `frontend/lib/requests/**`                  | Use `fetchAPI()`, `CACHE_TAGS`, 900s default revalidation           |
| `server-actions`    | `frontend/lib/actions*`                     | Raw `fetch()` needs `flattenAttributes()`, always `revalidateTag()` |
| `strapi-backend`    | `backend/src/api/**`                        | Entity Service API only, numeric IDs, nested responses              |
| `testing`           | `**/*.test.*`                               | Mock with flat data, `jest.clearAllMocks()`, role-based queries     |

## What's Custom vs. Off-the-Shelf

This workflow was built from scratch for Odyssey, informed by patterns from other Claude Code projects and frameworks. Here's what came from where:

### Entirely custom to Odyssey

- **All 6 agents** — Written specifically for this codebase. The planner parses Linear tickets, the implementer knows Odyssey's TDD mock patterns, the auditor creates Linear tickets for findings.
- **All 6 skills** — Every line encodes Odyssey-specific knowledge (Strapi v4.22 query patterns, the `flattenAttributes` rule, the cache tag invalidation matrix). Generic skills were removed.
- **All 6 rules** — Path-conditional to Odyssey's file structure.
- **All 7 commands** — Dispatch logic tailored to Odyssey's workflow and `docs/plans/` convention.
- **9 hooks** — Safety guards, formatting, and workflow automation.
- **Wrap-up + learnings system** — Custom knowledge management with lifecycle tracking, hard file limits, and pruning. Not derived from any framework.
- **`pre-compact.sh`** — Preserving version constraints through context compression. No framework does this.
- **`suggest-next.sh`** — Auto-detecting workflow position by parsing plan file checkboxes.

### Inspired by other frameworks

| What we built                                                            | Inspired by                                                                                    | What we changed                                                                  |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 6-agent pipeline (brainstorm → plan → implement → review → audit → ship) | [Superpowers](https://github.com/obra/superpowers) (brainstorm → plan → implement → review)    | Added auditor + wrap-up. Made every agent Odyssey-specific.                      |
| Devil's advocate validator in auditor                                    | [Trail of Bits](https://github.com/trailofbits/claude-code-config) adversarial review patterns | Applied as a false-positive filter with fresh-context subagent                   |
| `/ship` command                                                          | [gstack](https://github.com/garrytan/gstack) `/ship` (Garry Tan)                               | Adapted to Odyssey's no-push policy                                              |
| File-based state passing via `docs/plans/`                               | [BMAD Method](https://github.com/aj-geddes/claude-code-bmad-skills) phase system               | Used `docs/plans/` as the shared state bus instead of BMAD's role-based handoffs |
| Path-conditional rules                                                   | [Cursor](https://cursor.com/docs/context/rules) `.mdc` rules                                   | Claude Code's native `paths:` frontmatter                                        |
| Quality gate hook                                                        | [Trail of Bits](https://github.com/trailofbits/claude-code-config) hook patterns               | Auto-format on every turn using Prettier                                         |
| `skill-suggest.sh` keyword matching                                      | Cursor's auto-rule suggestion                                                                  | Adapted as a UserPromptSubmit hook                                               |

### Used as-is from Superpowers plugin

We use exactly 3 Superpowers skills (all others are ignored):

| Superpowers skill                | Why we use it                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `systematic-debugging`           | Generic 4-phase root cause process. Complements our Odyssey-specific debugging skill.        |
| `verification-before-completion` | Forces "evidence before claims" — must run verification commands before declaring work done. |
| `dispatching-parallel-agents`    | Patterns for concurrent subagent dispatch.                                                   |

Everything else in Superpowers (brainstorming, planning, TDD, code review, git worktrees, skill writing) overlaps with our custom agents and is explicitly ignored in `CLAUDE.md`.

### Official Anthropic plugin

**Code Simplifier** — Anthropic's internal code quality agent. Reviews changed code for clarity, consistency, and maintainability. Install with: `claude plugin install code-simplifier`

## Critical Version Constraints

These apply to every task. Violating them causes silent bugs.

- **Strapi v4.22** — Entity Service API, numeric `id`, nested `{ data: { attributes: {} } }` responses. NEVER use Document Service API, `documentId`, or flat responses (v5).
- **Tailwind v3.4** — `tailwind.config.ts`. NEVER use `@theme` or CSS-first config (v4).
- **Next.js 15** — `cache` and `next` fetch options are mutually exclusive. Passing both silently breaks caching.

## The #1 Bug Source

`fetchAPI()` auto-flattens Strapi responses. Raw `fetch()` does NOT.

Every Server Action that uses raw `fetch()` (for PUT/POST/DELETE) **must** call `flattenAttributes()` on the response manually. Forgetting this is the most common bug in the codebase.

```typescript
// In a Server Action:
const response = await fetch(`${STRAPI_URL}/api/things/${id}`, { method: "PUT", ... });
const json = await response.json();
const result = flattenAttributes(json.data);  // REQUIRED — raw fetch doesn't auto-flatten
revalidateTag(CACHE_TAGS.things);             // REQUIRED — bust the cache
```

## Reference Docs

In `docs/agent/`. Read when your task touches the relevant area — don't preload all of them.

| Doc                         | Read when                                                       |
| --------------------------- | --------------------------------------------------------------- |
| `frontend-architecture.md`  | Routes, components, auth, UI structure                          |
| `backend-architecture.md`   | Content types, domain model, Strapi API, full schema reference  |
| `data-fetching.md`          | fetchAPI internals, cache tags, invalidation patterns           |
| `testing-and-deployment.md` | Jest patterns, E2E tests, CI pipeline, deployment, environments |
| `workflow.md`               | Agent design rationale and troubleshooting                      |
| `learnings/`                | Gotchas discovered in past sessions                             |

## Permissions & Safety

**Permission deny list** (`.claude/settings.json`):

- Reads: `frontend/.env.local`, `backend/.env`, `terraform/*`, `~/.ssh/**`, `~/.aws/**`
- Bash: `sudo *`, `curl * | bash *`, `wget * | bash *`

**Hook-enforced blocks** (cannot be bypassed via prompt):

- `protect-files.sh`: `.env*`, lock files, docker-compose, terraform
- `block-dangerous-commands.sh`: destructive rm, all remote git ops, npm publish

Claude Code is configured to **never**:

- Push code, create remote branches, or modify the remote repository
- Edit `.env` files, credentials, `terraform/`, or `docker-compose.yml`
- Delete files without explicit approval
- Run `sudo`, `npm publish`, `git merge`, or `git rebase`
- Create manual git worktrees (managed automatically by the implementer agent)

## File Structure

```
odyssey/
├── CLAUDE.md                ← Always loaded. Project rules, commands, skills table.
├── AGENTS.md                ← Always loaded. Workflow diagram, agent table, state passing.
├── CONTRIBUTING.md          ← This file. Human-readable guide.
├── .mcp.json                ← Playwright MCP config.
│
├── frontend/CLAUDE.md       ← Auto-loaded in frontend/. Extra frontend rules.
├── backend/CLAUDE.md        ← Auto-loaded in backend/. Extra backend rules.
│
├── .claude/
│   ├── settings.json        ← Hooks, permissions, plugin registration
│   ├── settings.local.json  ← Per-developer auto-allow rules (not committed)
│   ├── agents/              ← 6 agent prompts
│   ├── skills/              ← 6 domain-specific skills (on-demand)
│   ├── rules/               ← 6 path-conditional rules (auto-activate)
│   ├── commands/            ← 7 slash commands
│   └── hooks/               ← 9 shell scripts (formatting, protection, suggestions, audit)
│
├── docs/
│   ├── agent/               ← Reference docs (architecture, data fetching, testing, workflow)
│   │   └── learnings/       ← Accumulated gotchas from past sessions
│   └── plans/               ← Shared state between agents (specs, plans, audits, progress)
│
└── scripts/
    ├── ci-local.sh          ← CI runner (used by /ci command)
    └── create-linear-ticket.sh ← Linear API (used by auditor agent)
```

## Session Tips

- **Switching tasks:** Use `/clear` when switching to an unrelated task to start with fresh context.
- **End of session:** Say "Use the wrap-up agent" to save progress and learnings for the next session.
- **Resuming work:** `session-start.sh` automatically injects previous session progress. Check `docs/plans/PROGRESS.md` if it exists.
- **Running tests:** The quality-gate hook only runs Prettier. Always run linting and tests explicitly: `cd frontend && npm test`
- **Linear tickets:** Pass ticket content to `/plan` — the planner parses both bug and feature ticket formats automatically.
