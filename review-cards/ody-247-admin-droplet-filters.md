title: Admin droplets table: filter by status, sort by dates (ODY-247)
risk: 🟡 test on dev
---
## Description

On the admin droplets page, admins can now filter by status (Draft, Edit, Published) and sort by created or last-updated date, newest or oldest first.

**How it affects Odyssey:** Admins see it in the Filter and Sort menus on the admin droplets table.

**Files**
- `frontend/components/admin/droplets/droplets-page-client.tsx`: status filter group, four new sort options
- `frontend/tests/components/admin/droplets-page-client.test.tsx`: tests

## Motivation and Context

The table could only filter by type and focus area and sort by title, which made it hard to find recent or unpublished droplets. This is all client-side on the data already loaded.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- Droplets missing a date sort as oldest.

**How to test on dev**
1. Open the admin droplets page, open Filter → there is a Status section with Draft, Edit and Published.
2. Tick Published → only published droplets remain; add Draft → both show.
3. Combine with a Type filter → rows must match both.
4. Open Sort and pick "Created: newest", then "Updated: oldest" → order changes correctly.

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
