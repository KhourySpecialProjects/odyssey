title: Mentor sidebar and Notes panel stay above the footer (ODY-914)
risk: 🟡 test on dev
kind: bug
---
The Mentor sidebar and Notes panel could slide under the site footer, and the Help and Notes buttons overlapped them; both now sit above the footer and the buttons sit fully beside the panels.
**Test on dev:** Open a lesson, scroll to the footer and open Mentor → the panel stays above the footer and the Help and Notes buttons don't overlap it.
**Overlaps:** `claude/ody-154-notes-close-animation` and `claude/ody-195-wider-lesson-content` (`droplet-lesson-wrapper.tsx`, `lesson-panel.ts`, `droplet-lesson-wrapper.test.tsx`).
**Suggested reviewer:** `JaylenZeng`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
