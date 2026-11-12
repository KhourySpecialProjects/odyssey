title: Delete buttons show a spinner while deleting (ODY-281)
risk: 🔴 careful
kind: bug
---
Deleting a block, lesson or droplet used to give no feedback; the button now shows a spinner and is disabled until the delete finishes.
**Careful:** It changes the buttons that delete blocks, lessons and droplets, so check that each delete still runs once and still asks for confirmation.
**Test on dev:** In the draft editor, delete a block → its button shows a spinner and can't be clicked twice, then the block disappears.
**Overlaps:** `claude/ody-616-components-lint` (`blocks/callout.tsx`); `claude/ody-471-preview-sync` and other open `claude/` branches (`draft/lesson/lesson-renderer.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
