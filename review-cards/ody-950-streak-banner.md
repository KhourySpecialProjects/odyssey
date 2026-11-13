title: A more rewarding streak banner once today is lit (ODY-950)
risk: 🟡 test on dev
kind: feature

---

Once a learner's streak lights, the box under Previous / Next in a lesson shows only today's treasure, a large day count, a message that fits the day and one line about what's next.

**Test on dev:** Finish a lesson on a fresh day → the box shows only your treasure, a large day count and the new message, the treasure pops in and the number counts up; with reduce motion on, it appears without animating.
**Overlaps:** Doesn't touch `footer.tsx`, which #1332 edits. `litMessage` keeps its signature for the ODY-921 testing panel branch. The repo's check-branches CI rule fails PRs from `claude/` branches until a fix adding `claude/` lands.
**Suggested reviewer:** `bradycai` (streaks)

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
