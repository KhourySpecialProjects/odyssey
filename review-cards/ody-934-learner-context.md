title: Build Mentor's learner context from a student's enrollments (ODY-934)
risk: 🟡 test on dev
kind: feature
---
Adds the server code that turns a student's finished, in-progress and prerequisite droplets into Mentor's learner block; nothing calls it in production yet, so students see no change.

**Test on dev:** CI covers it, nothing calls it yet; ask Mentor a question → the answer is unchanged.
**Overlaps:** stacked on `claude/ody-934-personalize-switch`. Brady's ODY-968 edits `prompt.ts`, which this does not touch. Awad's ODY-935 adds `studentAllowsPersonalization`; the seam here uses the same name and signature, and ODY-937's route `after()` change is in the next PR only.
**Suggested reviewer:** bradycai

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
