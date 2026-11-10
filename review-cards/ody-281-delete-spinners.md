title: Delete buttons show a spinner and lock until the delete finishes (ODY-281)
risk: 🔴 careful
---
## Description

Deleting a block, a lesson or a droplet now shows a spinner and disables the button until the request ends. Repeat clicks are ignored.

**How it affects Odyssey:** Creators see it in the draft editor when deleting a block or slide break, a lesson, or a droplet.

**Files**
- `frontend/components/draft/lesson/blocks/delete-block-button.tsx`: new shared trash button with a spinner
- `frontend/components/draft/lesson/blocks/{callout,expandable,generic,open-ended-quiz,quiz,video}.tsx, block_tile.tsx`: use the shared button
- `frontend/components/draft/lesson/delete-lesson.tsx`: awaits the delete, then navigates; spinner icon
- `frontend/components/draft/metadata/delete-droplet.tsx`: spinner, "Deleting..." label, locks Cancel
- `frontend/components/draft/lesson/block_list.tsx, block_list_client.tsx, lesson-renderer.tsx`: types now allow an async delete
- `frontend/tests/components/draft/*.test.tsx`: tests

## Motivation and Context

Deletes give no feedback while they run, so users clicked again or thought nothing happened.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-616-components-lint` (`blocks/callout.tsx`); `ody-471-preview-sync`, `ody-535-draft-save-feedback`, `ody-879-flag-scroll-to-block`, `ody-897-remove-mark-addressed` (`draft/lesson/lesson-renderer.tsx`, a type-only change here).
- Marked 🔴 only because it touches delete flows. The delete requests themselves are unchanged and no `"use server"` file is touched.
- Behaviour change: `DeleteLessonButton` now waits for the delete before going back to the droplet page; before it did not await it.

**How to test on dev**
1. In a draft lesson, hover a block and click its trash icon → spinner shows, button is disabled, then the block disappears.
2. Do the same on a slide break and on each block type (callout, quiz, video, expandable) → same behaviour.
3. Delete a lesson from its page, confirm → spinner, then you return to the droplet page without the lesson.
4. Delete a droplet from Metadata, confirm → "Deleting..." shows, Cancel is disabled, then you land on `/my-content`.
5. Double-click a delete button → only one delete happens.

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
