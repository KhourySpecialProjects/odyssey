title: Lesson content gets wider when the notes sidebar is closed (ODY-195)
risk: 🟡 test on dev
kind: feature
---
Lesson content can now grow up to 1536px wide when the notes sidebar is closed.
**Test on dev:** Open a lesson on a wide screen with the notes sidebar closed → the content is wider than before; open the sidebar → it narrows again.
**Overlaps:** `claude/ody-154-notes-close-animation` and `claude/ody-914-mentor-sheet-stacking` (`droplet-lesson-wrapper.tsx`, `lesson-panel.ts`, `droplet-lesson-wrapper.test.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
