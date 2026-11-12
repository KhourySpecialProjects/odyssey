title: Callouts look the same in reader, present mode and editor (ODY-446)
risk: 🟡 test on dev
kind: bug
---
Callouts in the lesson reader and present mode looked different from the editor; they now share one icon, colour, padding and radius.
**Test on dev:** Add a callout in the editor, then view it in the lesson reader and in present mode → all three look the same.
**Overlaps:** `claude/ody-527-tailwind-classes` and `claude/ody-616-components-lint` (`droplets/lessons/lesson-renderer.tsx`); `claude/ody-261-latex-dollar-signs` (`presentation-block-renderer.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
