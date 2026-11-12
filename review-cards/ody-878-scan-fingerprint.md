title: "Edited since last scan" only shows when scanned content changed (ODY-878)
risk: 🔴 careful
kind: bug
---
The Overview scan page said "Edited since the last scan" after unrelated writes such as lock updates; it now compares a hash of the scanned content, which ignores lesson order ties and tag order.
**Careful:** Adds a `contentHash` field to the Overview scan schema; scans saved before this have none, so check how the page treats them.
**Test on dev:** Run an Overview scan, then open and close the lesson editor without changes → the page doesn't say it was edited.
**Overlaps:** `claude/ody-915-prompt-saved-by` (`contentTypes.d.ts`, `backend-architecture.md`); `claude/ody-897-remove-mark-addressed` (`backend-architecture.md`); `claude/ody-879-flag-scroll-to-block` (`overview-scan/view.ts`, `view.test.ts`).
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
