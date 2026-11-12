title: Publishing an edit keeps the draft's scan dismissals (ODY-922)
risk: 🔴 careful
kind: bug
---
Flags dismissed on an [EDIT] draft came back after publishing; the dismissals now move onto the original droplet, and a duplicate of one it already had is deleted.
**Careful:** It deletes the draft's duplicate dismissal rows and re-points the rest inside the publish step, so check the key match and that it stays in the transaction.
**Test on dev:** Dismiss a flag on an [EDIT] draft's scan, publish, then scan the original → the flag stays dismissed.
**Overlaps:** Stacked on `claude/ody-875-edit-scans-carry-over` (its log includes that commit) and touches the same `publish-edit.ts` and `publish-edit.test.js`; merge 875 first.
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
