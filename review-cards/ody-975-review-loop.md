title: Cloud squads review their own work, at most 3 reviews before a human (ODY-975)
risk: 🟢 skim
kind: cleanup
---
Docs only: a cloud squad now builds, checks and reviews its own work with a fresh read-only Opus reviewer, at most 3 reviews, and a branch with open findings is pushed marked Needs human.

**Test on dev:** read loop-reviewer-brief.md and the new agent-swarming section.
**Overlaps:** ODY-973 merges first (`docs/agent/agent-swarming.md`, `.claude/scripts/review-card-brief.md`; different lines).
**Suggested reviewer:** AwadBuisir10 (manager skill)

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
