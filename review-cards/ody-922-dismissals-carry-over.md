title: Keep dismissed Overview scan flags when an edit draft is published (ODY-922)
risk: 🔴 careful
---
## Description

Publishing an [EDIT] draft now moves its dismissed scan flags onto the original droplet. If the original already dismissed the same flag, the draft's duplicate row is deleted.

**How it affects Odyssey:** Creators: a flag dismissed while editing stays dismissed after publishing. Runs at publish time, no new screen.

**Files**
- `backend/src/lib/publish-edit.ts`: new `moveDismissalsToLive`, called after the scans step
- `backend/tests/api/publish-edit.test.js`: tests for move, duplicates and empty case

## Motivation and Context

Dismissals were tied to the draft copy, so they were lost on publish and dismissed flags came back.

**Merge notes**
- Depends on / stacked on: ody-875-edit-scans-carry-over (this branch contains its commit; merge ODY-875 first)
- Overlaps: ody-875-edit-scans-carry-over (same two files)
- Deletes rows: a draft dismissal that matches one on the original (same check, rule, part and block) is removed. No schema change.
- Runs inside the publish transaction.

**How to test on dev**
1. Open a published droplet, create an [EDIT] draft, run the Overview scan, and dismiss a flag → the flag is hidden.
2. Publish the edit → publish succeeds.
3. Open the original droplet's scan page → the flag is still dismissed.
4. Dismiss the same flag on both original and draft before publishing → after publishing it appears dismissed once, with no error.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
