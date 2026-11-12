title: Accessibility fixes on the learner path (ODY-543)
risk: 🟡 test on dev
kind: bug
---
Adds a skip link, one main landmark per page, labels on icon buttons, valid roles, and real buttons and links where clickable divs were used, across feed, friends, group due dates and the header.
**Test on dev:** Open the site and press Tab once → a "Skip to content" link appears and jumps to the page's main area.
**Overlaps:** `claude/ody-154-notes-close-animation` and `claude/ody-472-no-drag-paste` (`globals.css`); `claude/ody-527-tailwind-classes` (`student-progress-list.tsx`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
