title: Preview waits for autosave and shows the latest edits (ODY-471)
risk: 🟡 test on dev
kind: bug
---
Clicking Preview could show stale content; it now waits for the pending autosave, saves a pending lesson title and refreshes the lesson, so you see your latest edits.
**Test on dev:** Type in a lesson and click Preview straight away → the preview shows the text you just typed.
**Overlaps:** `claude/ody-211-delete-draft` and `claude/ody-616-components-lint` (`draft/sidebar.tsx`, `sidebar.test.tsx`); `claude/ody-281-delete-spinners` (`draft/lesson/lesson-renderer.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
