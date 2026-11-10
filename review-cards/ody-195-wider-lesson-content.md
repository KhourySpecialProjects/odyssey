title: Lesson content gets wider when the notes sidebar is closed (ODY-195)
risk: 🟡 test on dev
---
## Description

When neither the notes nor the mentor panel is open, lesson content now uses smaller side padding and can grow up to 1536px wide. With a panel open it keeps the old padding.

**How it affects Odyssey:** Learners see wider lesson text on large screens on a lesson page.

**Files**
- `frontend/components/droplets/lessons/droplet-lesson-wrapper.tsx`: picks closed or panel-open padding
- `frontend/lib/lesson-panel.ts`: two new class constants
- `frontend/tests/components/droplets/droplet-lesson-wrapper.test.tsx`: tests for both layouts

## Motivation and Context

The old fixed side padding left wide windows with a narrow column of content when no panel was open.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-154-notes-close-animation` and `ody-914-mentor-sheet-stacking` (`droplet-lesson-wrapper.tsx`, `lesson-panel.ts`, `droplet-lesson-wrapper.test.tsx`).
- Layout change for every lesson page; check images, tables and code blocks still look right at the new width.

**How to test on dev**
1. Open a lesson on a wide window (over 1536px) with no panel open → content is centred and about 1536px wide at most.
2. Open the notes panel → content shrinks to the old width and does not sit under the panel.
3. Open the mentor panel → same as notes.
4. Close the panel → content widens smoothly.
5. Check a lesson with a big image or table → nothing overflows.

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
