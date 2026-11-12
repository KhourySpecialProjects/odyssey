title: Notes sidebar slides out when it closes (ODY-154)
risk: 🟡 test on dev
kind: feature
---
The lesson notes sidebar now slides out when you close it, the same way it slides in.
**Test on dev:** Open a lesson, open the notes sidebar, then close it → it slides out instead of vanishing.
**Overlaps:** `claude/ody-195-wider-lesson-content` and `claude/ody-914-mentor-sheet-stacking` (`droplet-lesson-wrapper.tsx`, `lesson-panel.ts`, `droplet-lesson-wrapper.test.tsx`); `claude/ody-472-no-drag-paste` and `claude/ody-543-a11y-learner-path` (`globals.css`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
