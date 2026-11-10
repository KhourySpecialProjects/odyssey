title: Favorited droplets show in Activity even if not enrolled (ODY-473)
risk: 🟡 test on dev
---
## Description

The Favorites list in Activity is now built from the user's favorited droplets, not from their enrollments, so a droplet they favorited without enrolling now appears. Progress still comes from enrollments.

**How it affects Odyssey:** Learners see it in the Favorites tab of Activity (dashboard).

**Files**
- `frontend/components/dashboard/favorited-droplet-grid.tsx`: loads favorited droplets directly
- `frontend/tests/components/dashboard/favorited-droplet-grid.test.tsx`: tests

## Motivation and Context

Favorites were read through enrollments, so favoriting from Explore without enrolling made the heart appear to do nothing in Activity.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- One extra droplets request when the user has favorites (pageSize equals the number of favorites).

**How to test on dev**
1. Favorite a droplet from Explore that you are not enrolled in → it appears in Activity → Favorites.
2. Favorite one you are enrolled in → it shows with its progress bar.
3. Remove the favorite → it disappears (cache can take a moment).
4. With no favorites → the empty state shows.

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
