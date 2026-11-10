title: Preview shows your latest edits and no longer waits needlessly (ODY-471)
risk: 🟡 test on dev
---
## Description

The sidebar Preview link now waits for the lesson editor to save, refreshes the lesson cache, then opens the preview. It also saves a pending lesson title, and skips the wait when no lesson editor is open.

**How it affects Odyssey:** Creators see it when they click Preview in the draft editor sidebar.

**Files**
- `frontend/components/draft/sidebar.tsx`: Preview click waits for save, then calls `revalidateLesson`, then navigates
- `frontend/components/draft/lesson/lesson-renderer.tsx`: flush also saves the title; registers the editor
- `frontend/lib/lesson-editor-registry.ts`: counts mounted lesson editors
- `frontend/tests/components/draft/{sidebar,lesson-renderer}.test.tsx`: tests

## Motivation and Context

Preview could show stale content because autosave skips cache refresh, and on pages with no editor it sat for the full 5 s timeout.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-211-delete-draft` (`sidebar.tsx`, `sidebar.test.tsx`); `ody-616-components-lint`, `ody-281-delete-spinners`, `ody-535-draft-save-feedback`, `ody-879-flag-scroll-to-block`, `ody-897-remove-mark-addressed` (`draft/lesson/lesson-renderer.tsx` and others).
- Modified clicks (Ctrl/Cmd/Shift, middle click) still use the normal link behaviour, so they skip the save wait.
- `revalidateLesson` failures are swallowed so Preview always opens.

**How to test on dev**
1. Edit lesson text and click Preview straight away → the preview shows the new text.
2. Change a lesson title and click Preview straight away → the new title shows.
3. From the droplet Overview page, click Preview → opens at once, no 5 s pause.
4. Ctrl/Cmd-click Preview → opens in a new tab as a normal link.

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
