# Odyssey — Khoury College Education Platform

Next.js 15 + Strapi 5 education platform at khouryodyssey.org. Makes education content discoverable and completable by Northeastern students through bite-sized learning units called "droplets."

## Project Map

```
frontend/          Next.js 15 App Router (TypeScript, Tailwind v3.4)
backend/           Strapi CMS v5 (Document Service API, PostgreSQL)
terraform/         AWS infra — DO NOT MODIFY
initdb/            Database seed scripts
docs/agent/        Detailed reference docs (read when relevant to your task)
```

Frontend fetches from Strapi REST via `STRAPI_ACCESS_TOKEN`. Media on S3/CDN. Auth via NextAuth (Azure AD + GitHub OAuth). Deployed on AWS ECS behind ALB.

## Critical Version Constraints

- **Strapi 5.56** — use the Context7 v5 docs for backend config and APIs.
- **Document Service, never Entity Service** — `backend/tests/no-entity-service.test.js` fails on `entityService`.
- **The frontend sends `Strapi-Response-Format: v4`**, so responses stay nested. Every raw `fetch()` spreads `STRAPI_RESPONSE_FORMAT_HEADER` (guard: `frontend/testing/lib/strapi-response-format-guard.test.ts`).
- **`id` vs `documentId`** — numeric `id` for filters, comparisons and cache tags; `documentId` for single-entry URLs and relation writes (numeric ids 404). See `docs/agent/data-fetching.md`.
- **Draft & Publish is off everywhere** — `status` is a domain field. Never send `publicationState`. New types set `draftAndPublish: false`.
- **`production` is still Strapi v4 until ODY-603.** On a branch cut from `production`, follow that branch's docs.
- **Tailwind v3.4** — `tailwind.config.ts`. NEVER use `@theme`, CSS-first config (v4).
- **Next.js 15** — App Router, Server Components by default. `cache` and `next` fetch options are mutually exclusive — passing both silently breaks caching.

## Commands

```bash
npm run dev              # Both services via concurrently (frontend :3000, backend :1337)
cd frontend && npm test  # Jest unit tests
```

Run `/ci` in Claude Code to run the full CI pipeline locally (prettier + lint + tests + builds).
Run `/ci quick` to skip builds. Linting and formatting run automatically via CI hooks.

Workflow commands:

- `/plan [task]` — Invoke the planner agent (explores alternatives for non-trivial tasks, then writes spec + plan)
- `/implement [plan path]` — Invoke the implementer agent
- `/review [focus]` — Invoke the reviewer agent
- `/audit [scope]` — Invoke the auditor agent (expensive, use once before merge)
- `/ship` — Run CI, prepare PR summary, verify branch is ready to push

## Core Patterns

These apply to virtually every task:

- `fetchAPI()` in `lib/utils.ts` — single entry point for all Strapi calls. Auto-flattens Strapi responses by default. Only call `flattenAttributes()` manually when using raw `fetch()` (e.g., PUT/DELETE in Server Actions).
- DELETE returns an empty 204: read it with `readJsonOrNull` (`lib/strapi-response.ts`), not `res.json()`
- Unknown query or body keys return 400 "Invalid key" (strict REST)
- `qs` library builds Strapi query strings (populate/filters/pagination)
- `cn()` utility (clsx + tailwind-merge) for conditional Tailwind classes
- Zod schemas in `frontend/lib/validations/` validate form data
- `CACHE_TAGS` constants in `lib/cache-tags.ts` — never hardcode tag strings
- Server Actions use `"use server"` directive at file top, call `revalidateTag()` after mutations
- Path alias: `@/*` resolves from frontend root

## Conventions

- Always read existing files before modifying them
- Work in dependency order: types → utils → components
- Prefer editing existing files over creating new ones
- Use `/clear` when switching to an unrelated task.

## Reference Docs

Read these when your task touches the relevant area. Don't preload all of them.

| Doc                                    | Read when                                                    |
| -------------------------------------- | ------------------------------------------------------------ |
| `docs/agent/frontend-architecture.md`  | Working on routes, components, auth, or UI structure         |
| `docs/agent/backend-architecture.md`   | Working on content types, domain model, or Strapi API        |
| `docs/agent/data-fetching.md`          | Writing or debugging data fetching, caching, or invalidation |
| `docs/agent/testing-and-deployment.md` | Writing tests, debugging CI, or checking environments        |
| `docs/agent/workflow.md`               | Agent design rationale and troubleshooting                   |
| `docs/agent/learnings/`                | Accumulated gotchas and discoveries from past sessions       |
| `docs/agent/server-action-auth.md`     | Writing or changing any "use server" export                  |

## Skills

Six domain-specific skills with `invocation: auto` — Claude loads them automatically when the task matches. No manual invocation needed.

| Skill                     | Use when                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| `systematic-debugging`    | Any bug, test failure, or unexpected behavior (4-phase root cause)     |
| `react-patterns`          | Building components, routes, Server/Client decisions, Suspense         |
| `testing-patterns`        | Writing Jest tests, fixing test failures, setting up mocks             |
| `data-fetching`           | Request functions, cache tags, invalidation, Server Actions            |
| `strapi-v5-patterns`      | Strapi v5 Document Service, documentId, query building, schema reading |
| `schema-change-checklist` | Modifying Strapi content types (ripple effect checklist)               |

## Agents

Five agents in `.claude/agents/` for structured workflows. Use `/plan`, `/implement`, `/review`, `/audit` commands to invoke them, or "Use the wrap-up agent" for end-of-session. See `AGENTS.md` for the workflow and state passing.

## MCP Servers

Configured in `.mcp.json` (project-scoped, safe to commit):

- **Playwright** — Browser automation via accessibility tree. Use to verify UI changes, explore the running app, or generate E2E test code from real interactions.
- **Context7** — Up-to-date library documentation for Next.js, Strapi, Tailwind, and other dependencies. Use when the correct API or pattern is unclear.

Per-developer (user-scoped, not committed):

- **Linear** — Read/create/update Linear issues. Set up with: `claude mcp add --transport http linear https://mcp.linear.app/mcp`
- **Figma** — Inspect designs, extract tokens, and implement components with 1:1 fidelity. Set up with: `claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp` then authenticate via `/mcp` → figma → Authenticate.

## Restrictions

- NEVER push code, create remote branches, or modify the remote repository
- Local git worktrees are allowed ONLY via the implementer agent's `isolation: worktree` setting — do not manually run git worktree commands
- NEVER delete files without explicit approval
- NEVER modify .env, credentials, terraform/, or docker-compose.yml

## Plugins

Plugins extend Claude Code with LSP intelligence, workflow tools, and external integrations. They are pre-packaged and installed from the `claude-plugins-official` marketplace. Install with `claude plugin install <name>@claude-plugins-official --scope project`.

Three types of plugins exist:

- **LSP plugins** — Connect to a language server running locally, providing real type checking, diagnostics, and code navigation (same engine that powers VS Code squiggly lines).
- **Workflow plugins** — Add skills, agents, and slash commands that extend how Claude works (debugging workflows, code review, etc.).
- **MCP plugins** — Pre-configured MCP servers for external services (Figma, GitHub, Linear, etc.). Same as `.mcp.json` entries but packaged for easy install.

### Project-scoped plugins (shared via repo)

| Plugin            | Type     | What it does                                                                                                                              |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript-lsp`  | LSP      | Connects to the TypeScript compiler for real type errors, missing imports, and go-to-definition after edits. Essential for this codebase. |
| `code-simplifier` | Workflow | Reviews changed code for clarity, consistency, and maintainability.                                                                       |
| `superpowers`     | Workflow | Extended skills for debugging, verification, and parallel agents. See overrides below.                                                    |

### Superpowers overrides

**USE these Superpowers skills** (they fill gaps our agents don't cover):

- `superpowers:systematic-debugging` — For ANY bug investigation. 4-phase root cause process.
- `superpowers:verification-before-completion` — Before declaring any task done.
- `superpowers:dispatching-parallel-agents` — For concurrent subagent spawning.

**IGNORE all other Superpowers skills.** Our custom agents and skills handle planning, implementation, code review, TDD, and git workflows. If Superpowers auto-activates a skill that overlaps with an Odyssey agent, use the agent instead. NEVER use any git-related Superpowers skills — we do not do git operations.
