title: Callouts look the same in the reader and present mode as in the editor (ODY-446)
risk: 🟡 test on dev
---
## Description

Callouts in the lesson reader and present mode now use the same colours, icons, padding and corner radius as in the creator's editor. Old callouts without a type keep their stored colour.

**How it affects Odyssey:** Learners see it on lesson pages and in present mode; creators see no change in the editor.

**Files**
- `frontend/lib/blocknote/callout-styles.ts`: one shared table of callout colours, icons and layout
- `frontend/components/ui/callout-surface.tsx`: new read-only callout frame
- `frontend/components/ui/blocknote/blocks/callout-block.tsx`: editor block now uses the shared table
- `frontend/components/droplets/lessons/lesson-renderer.tsx, presentation/presentation-block-renderer.tsx`: use the new frame
- `frontend/tests/components/ui/callout-surface.test.tsx`: tests

## Motivation and Context

The reader showed callouts in a different style from what the creator saw while editing.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-527-tailwind-classes`, `ody-529-lesson-progress`, `ody-616-components-lint` (`droplets/lessons/lesson-renderer.tsx`); `ody-261-latex-dollar-signs` (`presentation-block-renderer.tsx`).
- The editor's callout block was refactored too, so check creators still see no change.

**How to test on dev**
1. Open a lesson with one callout of each type (warning, question, important, definition, more information, caution, default) → colours and icons match the editor.
2. Check one with the icon turned off → no icon.
3. Open an older lesson with a classic callout → looks as before.
4. Open present mode on the same lesson → same style.
5. Switch to dark mode → text stays readable.

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
