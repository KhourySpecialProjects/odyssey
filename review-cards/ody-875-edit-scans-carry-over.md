title: Publishing an edit keeps the draft's overview scans (ODY-875)
risk: 🔴 careful
kind: feature
---
When an [EDIT] draft is published, its overview scans are now moved onto the original droplet so the scan history carries over.
**Careful:** It re-points scan records to another droplet inside the publish step; check it runs in the same transaction so a failure rolls back.
**Test on dev:** Run an Overview scan on an [EDIT] draft, publish it, then open the original droplet's scan page → the scan is still listed.
**Overlaps:** `claude/ody-922-dismissals-carry-over` is stacked on this branch (contains this commit) and touches `publish-edit.ts` and `publish-edit.test.js`.
**Suggested reviewer:** `AwadBuisir10`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
