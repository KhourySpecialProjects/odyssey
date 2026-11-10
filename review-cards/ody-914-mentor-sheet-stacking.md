title: Keep the Mentor sidebar and Notes panel above the footer (ODY-914)
risk: 🟡 test on dev
---
## Description

Raises the Mentor sidebar and Notes panel stacking, removes the wrapper's z-index, and moves the Help and Notes toggle buttons 32px left so they sit fully beside the panels.

**How it affects Odyssey:** Learners on a droplet lesson: the Mentor sidebar and Notes panel are no longer cut off by the site footer, and the toggle buttons no longer overlap the panels.

**Files**
- `frontend/components/droplets/lessons/droplet-lesson-wrapper.tsx`: drops `z-30` on the wrapper; notes bar `z-[55]`
- `frontend/lib/lesson-panel.ts`: panel `z-[55]`; `toggleRight` 360px to 392px
- `frontend/tests/**`: class assertions for both

## Motivation and Context

The footer drew over the side panels, and the toggle buttons sat partly under them.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: ody-154-notes-close-animation and ody-195-wider-lesson-content (`droplet-lesson-wrapper.tsx`, `lesson-panel.ts`, `droplet-lesson-wrapper.test.tsx`); expect textual conflicts
- Class changes only; check the 380px panel width and 48px toggle column in ody-195 if both land.

**How to test on dev**
1. Open a droplet lesson on a desktop-width window and open the Mentor sidebar → it stays above the footer when you scroll to the bottom.
2. Open the Notes panel → same.
3. Look at the Help and Notes buttons → they sit fully to the left of the open panel, not overlapping it.
4. Resize to phone width → the full-screen panel still covers the page.

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
