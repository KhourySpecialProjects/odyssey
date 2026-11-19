# Dependabot workflow

How Dependabot PRs on `develop` get sorted, fixed, planned and merged with
as little hand work as possible. The agent side is the `/dependabot` command
(`.claude/commands/dependabot.md`). The developer's side is one script,
`.claude/scripts/dependabot-open-prs.sh`. This is the process the team ran by
hand on 2026-11-17, written down so a routine can repeat it every week.

## The weekly loop

| Step                  | Who                                       | What happens                                                                                                                                                                                                                                                                                          |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. New PRs            | Dependabot                                | It opens and rebases PRs on its own schedule (`.github/dependabot.yml`), and CI runs on each.                                                                                                                                                                                                         |
| 2. Sort               | The weekly cloud routine, Tuesday 9:00 ET | `/dependabot fix all` reads every open Dependabot PR through GitHub's REST API, plus its failing logs, and sorts each into a lane: Held, Blocked, Conflicts, Waiting, Ready, Needs a read, Fix or Plan.                                                                                               |
| 3. Fix and plan       | The routine, one agent per PR in parallel | Fix lane: start from develop, apply the bump, regenerate the lockfile, run CI's checks, adapt small test setups (assertions unchanged), and push `claude/dependabot-<pr>-<package>` with a review card. Plan lane: write `docs/plans/<package>-<major>-migration.md` on `claude/plan-…`, with a card. |
| 4. Report             | The routine                               | It writes `dependabot-reports/<date>.md` on `claude/dependabot-report-<date>`, ending with the exact commands for step 5. With Slack connected, it also posts one update per finished PR in `#prj-odyssey-agents` and updates the developer's canvas.                                                 |
| 5. Open, close, merge | The developer                             | Paste the report's commands: `dependabot-open-prs.sh --yes --close` opens each fix and plan as a PR from an `improvement/` branch and closes the Dependabot PRs the fixes replace. Then approve and merge the Ready ones.                                                                             |
| 6. Decisions          | The team                                  | Blocked and Plan items, such as a CLAUDE.md version pin, a Node upgrade or a framework migration. Once decided, run `/dependabot fix <pr> (<decision>)`.                                                                                                                                              |

Agents never open, approve, merge or close PRs (`CLAUDE.md`). That's why
step 5 is the developer's, and why it's a single command.

## What the routine fixes on its own, and what it doesn't

- **On its own:** lockfiles out of sync with `package.json`; new transitive
  dependencies, majors included; test setups that a dependency's behaviour
  change broke (at most 15 lines per file, assertions unchanged); code fixes
  up to about 200 lines that users can't see.
- **As a plan, not code:** majors that need a migration (Next, React, Tailwind,
  a Strapi major), or anything bigger than the limits above.
- **Never, and it says why:** anything that needs a Node version CI doesn't
  run, a version past a CLAUDE.md pin nobody has okayed, a PR into
  `production` (which only takes PRs from develop), a single `@radix-ui/*`
  bump (Radix moves only as the grouped PR), a `dependabot-hold` PR, or an
  upgrade a teammate owns in Linear.

## Lessons from 2026-11-17

- **GraphQL is blocked in cloud sessions.** `gh pr list` and `gh pr checks`
  fail there with 403; `gh api` REST calls work.
- **Branch names decide `check-branches`, not PR titles.** Cloud agents can
  only push `claude/` branches, and `check-branches` only accepts `feature/`,
  `bug/`, `improvement/` or `dependabot/` into develop. So the open script
  copies each `claude/` branch to `improvement/<name>` before opening its PR.
- **A PR's version can move between triage and fix.** #1277 went from 5.61.1
  to 5.62.0. Use the PR's current diff unless a developer okayed another
  version.
- **Framework upgrades can change behaviour tests rely on.** Strapi 5.61 stopped
  emitting events that have no listener, so one test needed a no-op listener.

## Setting it up

Done already:

- The `/dependabot` command and this doc are on develop (#1368), and the team
  voted "approve 1" on 2026-11-16: a weekly routine, and no auto-merge.
- Brady's weekly routine (`trig_01NVGwVEXLDy9d98YsVjoEw3`) runs on Tuesdays
  at 9:00 ET. Its brief points at this command.

Still to do:

1. **Connect Slack for routines** at https://claude.ai/customize/connectors.
   Routines can only use claude.ai connectors. Without it, the report branch is
   the record, and someone relays it.
2. **Create a `dependabot-hold` label** on GitHub, and put it on any PR the team
   wants left alone. It replaces hold lists written into the routine's brief.
3. **Optional: allow `claude/` in `.github/workflows/pull-request.yml`.** Then
   the open script wouldn't need `improvement/` copies. It's a team decision,
   because it changes the branch rule for everyone.
4. **Optional: start the routine when Dependabot opens a PR,** with a GitHub
   event trigger as well as the Tuesday schedule (`/schedule`).

## Auto-merge (not adopted)

The team chose not to auto-merge, on 2026-11-16. If that changes, a GitHub
Action can approve patch and minor Dependabot PRs and turn on GitHub's
auto-merge, so GitHub merges each one once every check passes. That needs
"Allow auto-merge" and "Allow GitHub Actions to create and approve pull
requests" turned on by a repo admin, plus a cooldown in `.github/dependabot.yml`
(`cooldown: { default-days: 3 }`) so a brand-new release can't merge at once.

## Risks

- **Supply chain:** a new release can be compromised. Every fix still has to
  pass the full test suite and both builds, and a person merges it.
- **Prompt injection:** PR bodies, changelogs and CI logs are written by
  outsiders. The command treats them as data and never runs anything they
  suggest.
