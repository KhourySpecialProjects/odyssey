title: Explore: add a Reset filters button to the no-results page (ODY-256)
risk: 🟡 test on dev
---
## Description

When Explore finds no droplets, the empty message now has a "Reset filters" button. It clears the filters, search and page, and keeps the sort.

**How it affects Odyssey:** Learners see it on Explore when filters or search return nothing. It does not show if no filter or search is active.

**Files**
- `frontend/components/explore/reset-filters-button.tsx`: new button that clears filter, tag, search and page params
- `frontend/components/explore/droplets-grid.tsx, sorted-droplets-grid.tsx`: show it in both empty states
- `frontend/components/ui/empty-state.tsx`: optional `action` slot
- `frontend/tests/components/explore/*.test.tsx`: tests

## Motivation and Context

Users who filtered themselves into an empty list had to clear each filter by hand.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- Sort and content type are kept on purpose.

**How to test on dev**
1. Open Explore and pick filters that match nothing → "No droplets found" shows a Reset filters button.
2. Click it → filters, search text and page reset, the list returns, and the sort is unchanged.
3. Search for gibberish → same button appears and clears the search box.
4. Open Explore with no filters → no button.

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
