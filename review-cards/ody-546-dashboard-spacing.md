title: Match admin Reports row button size and gaps to other admin tables (ODY-546)
risk: 🟡 test on dev
---
## Description

The two action buttons in each admin Reports row are now 32px (was 30px) with an 8px gap (was 10px), the same as the other admin tables.

**How it affects Odyssey:** Admins, on the Reports page of the admin dashboard.

**Files**
- `frontend/components/admin/reports/reports-page-client.tsx`: button size and gap classes

## Motivation and Context

The Reports table's action buttons were a slightly different size and spacing from the other admin tables.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- Three class changes, no logic.

**How to test on dev**
1. Open the admin Reports page → the view and delete buttons are the same size and spacing as in the admin Droplets table; the view link and delete still work.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [ ] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
