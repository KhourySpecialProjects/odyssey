title: Review panel dock no longer says "dialog" on wide screens (ODY-872)
risk: 🟢 skim
kind: bug
---
On screens 1280px wide or more, the review panel dock wrongly had `role=dialog` on first load; it no longer does.
**Test on dev:** Open the review panel on a wide screen → it works as before; a screen reader doesn't announce it as a dialog.
**Overlaps:** none
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
