# Dependabot workflow

How Dependabot PRs on `develop` get checked, fixed and merged with as little
hand work as possible. The agent side is the `/dependabot` command
(`.claude/commands/dependabot.md`).

## Who does what

| Step                                                                | Done by                                               | Needs                                      |
| ------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| Open PRs each week, rebase them on conflicts                        | Dependabot                                            | `.github/dependabot.yml` (already set up)  |
| Run the checks                                                      | GitHub Actions                                        | The existing workflows                     |
| Sort PRs into lanes, fix failing ones on `claude/` branches, report | `/dependabot`, weekly as a cloud routine              | A routine set up with `/schedule`          |
| Open the fix PRs                                                    | The developer                                         | `bash .claude/scripts/open-prs.sh`         |
| Approve and merge patch and minor PRs                               | The developer today, or the auto-merge Action (below) | The team's agreement and two repo settings |
| Major upgrades                                                      | A person, through a Linear ticket                     | ODY-906 holds today's                      |

Agents never approve or merge (`CLAUDE.md`). Auto-merge keeps that rule:
GitHub does the merge, and only once every check has passed.

## Today's state (2026-11-16)

- 13 open Dependabot PRs. Most pass every check, but they're `BLOCKED` because
  `develop` needs one approving review.
- The repo has **Allow auto-merge** turned off.
- Jaylen's ODY-906 owns the majors that need code changes. He asked that
  #1342, #1345, #1347, #1346, #1351 and #1352 not be merged, and #1350
  (Next 16) belongs to P-ODY-137.

## Setting it up

1. **Agree with the team.** Post an `[OPEN]` in `#prj-odyssey-agents`. Jaylen
   owns ODY-906, and auto-merge changes how everyone's PRs land. The decision
   is whether patch and minor Dependabot PRs may merge without a person
   approving each one.
2. **Add a `dependabot-hold` label,** and put it on the PRs ODY-906 asks to
   hold. Both `/dependabot` and the Action skip labelled PRs.
3. **Try `/dependabot triage` by hand** on today's PRs and check the lanes.
4. **Schedule it.** Run `/schedule` and create a weekly routine for Tuesday
   9:00 ET (`0 14 * * 2`), the day after Dependabot opens its PRs. Use the
   developer's environment and `claude-sonnet-5-5`, with the brief
   "Run /dependabot fix all and write the report". The manager agent relays
   the report to Slack.
5. **Only if the team agreed to auto-merge in step 1,** a repo admin:
   - turns on **Settings → General → Allow auto-merge**;
   - turns on **Settings → Actions → General → Allow GitHub Actions to create
     and approve pull requests**;
   - adds the workflow below as `.github/workflows/dependabot-auto-merge.yml`;
   - checks on one patch PR that the Action's approval counts toward
     `develop`'s required review. If it doesn't, the ruleset needs a bypass for
     the Action, or a person keeps approving.
6. **Add a cooldown** to each `updates` entry in `.github/dependabot.yml`, so a
   brand-new release waits a few days before it can merge:

   ```yaml
   cooldown:
     default-days: 3
     semver-major-days: 7
   ```

## The auto-merge Action

It approves and turns on auto-merge only for Dependabot's patch and minor
updates on `develop` that don't have the hold label. GitHub then merges each
PR when every check passes, and never merges a failing one.

```yaml
name: Dependabot auto-merge
on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    if: >-
      github.event.pull_request.user.login == 'dependabot[bot]' &&
      github.event.pull_request.base.ref == 'develop' &&
      !contains(github.event.pull_request.labels.*.name, 'dependabot-hold')
    runs-on: ubuntu-latest
    steps:
      - id: meta
        uses: dependabot/fetch-metadata@v2
      - if: steps.meta.outputs.update-type != 'version-update:semver-major'
        run: |
          gh pr review --approve "$PR_URL"
          gh pr merge --auto --merge "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Risks

- **Supply chain:** an auto-merged update can carry a compromised release.
  The cooldown and the "never majors" rule lower that risk, and every PR
  still has to pass the full test suite and both builds.
- **Prompt injection:** PR bodies and changelogs are written by outsiders.
  `/dependabot` treats them as data and never runs anything they suggest.
- **Lockfile churn:** each merge makes the other PRs rebase. Dependabot does
  that on its own, so the next run just sees them as Waiting.
