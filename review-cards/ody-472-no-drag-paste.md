title: Buttons and links can't be dragged into text boxes (ODY-472)
risk: 🟡 test on dev
kind: bug
---
Buttons, droplet link cards and links could be dragged into text boxes and the editor, leaving junk there; they no longer drag.
**Test on dev:** Try dragging a droplet card or a button into the lesson editor → nothing is dropped; the card still opens when clicked.
**Overlaps:** `claude/ody-496-explore-cards-align` and `claude/ody-527-tailwind-classes` (`droplet-tile.tsx`); `claude/ody-154-notes-close-animation` and `claude/ody-543-a11y-learner-path` (`globals.css`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
