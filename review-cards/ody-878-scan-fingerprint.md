title: Overview scan 'Edited since last scan' now uses a content fingerprint (ODY-878)
risk: 🔴 careful
---
## Description

Each scan now saves a hash of the content it read, and the scan page compares it with the droplet's current content. The hash ignores lesson ties, and the order of tags, prerequisites, postrequisites and datasets.

**How it affects Odyssey:** Creators on the Overview scan page: "Edited since the last scan" shows only when the scanned content really changed (not on lock heartbeats), and a deleted lesson is caught. Scans saved before this change show the notice only for a deleted flagged lesson.

**Files**
- `backend/src/api/overview-scan/content-types/overview-scan/schema.json`: new `contentHash` string field (max 64)
- `backend/types/generated/contentTypes.d.ts`: generated type for the field
- `frontend/lib/overview-scan/hash.ts`: new `hashScanDocument` (sha256 of stable JSON)
- `frontend/lib/overview-scan/scan.ts`: new `loadScanDocument`; stable sort by id on ties
- `frontend/lib/overview-scan/snapshot.ts`: sorts tags, relations and datasets
- `frontend/lib/overview-scan/view.ts`: compares hashes instead of `updatedAt`
- `frontend/app/(editing)/draft/d/[slug]/scan/page.tsx`: uses `loadScanDocument`
- `frontend/lib/requests/overview-scan.ts`: saves `contentHash` with the scan
- `docs/agent/backend-architecture.md`: notes the new field
- `tests (backend + frontend)`: hash, scan, view, request and content-type tests

## Motivation and Context

The old check compared `updatedAt` times. Lock writes bump those, so the notice showed falsely, and deleting an unflagged lesson was missed.

**Merge notes**
- Depends on / stacked on: nothing (two commits on this branch, both ODY-878)
- Overlaps: ody-879-flag-scroll-to-block (`frontend/lib/overview-scan/view.ts` and its test); ody-915-prompt-saved-by (`backend/types/generated/contentTypes.d.ts`, `docs/agent/backend-architecture.md`); ody-897-remove-mark-addressed (`docs/agent/backend-architecture.md`)
- Strapi schema change (new optional field). Strapi must restart to pick it up; existing scans have no hash.
- `frontend/lib/requests/overview-scan.ts` is a `"use server"` file; its exports already use `withAuth`, and only the saved data changed.

**How to test on dev**
1. Run an Overview scan on a draft, then reload the scan page → no "Edited since the last scan" notice.
2. Open the draft and just keep the lock (no edits), reload the scan page → still no notice.
3. Edit a lesson's text and save, reload the scan page → the notice shows.
4. Delete an unflagged lesson, reload → the notice shows.
5. Open a scan saved before this change → no notice unless a flagged lesson was deleted.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
