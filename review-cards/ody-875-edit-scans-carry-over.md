title: Keep Overview scan history when an edit draft is published (ODY-875)
risk: 🟡 test on dev
---
## Description

Publishing an [EDIT] draft now moves the draft's Overview scans onto the original droplet instead of losing them when the draft is deleted.

**How it affects Odyssey:** Creators and reviewers: the scan history on the original droplet now includes scans run while editing. Runs at publish time, no new screen.

**Files**
- `backend/src/lib/publish-edit.ts`: new `moveOverviewScansToLive` step inside `publishEdit`
- `backend/tests/api/publish-edit.test.js`: covers the scans moving to the original

## Motivation and Context

Scans are tied to the draft copy. When the draft was deleted after publishing, its scans went with it, so the original droplet showed no scan history from the edit.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: ody-922-dismissals-carry-over (stacks on this branch; same two files)
- Changes data at publish time: scan rows are re-pointed to the original, inside the publish transaction. No schema change.
- Only the scans move; scan dismissals are handled in ODY-922.

**How to test on dev**
1. Open a published droplet, choose Edit to create an [EDIT] draft, and run the Overview scan on the draft → a scan result appears.
2. Publish the edit → publish succeeds and the draft disappears.
3. Open the original droplet's Overview scan page → the scan from step 1 is listed/shown there.
4. Publish an edit that has no scans → still publishes with no error.

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
