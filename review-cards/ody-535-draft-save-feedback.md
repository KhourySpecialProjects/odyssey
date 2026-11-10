title: Show Saving, Saved and Failed with Retry in the draft editor (ODY-535)
risk: 🟡 test on dev
---
## Description

The lesson editor toolbar now shows the autosave state (Unsaved changes, Saving…, Saved just now, Save failed with a Retry button). The browser warns before closing or leaving with unsent changes, and a banner appears if you lose the editing lock.

**How it affects Odyssey:** Creators editing a draft lesson in the draft editor.

**Files**
- `frontend/hooks/useSaveStatus.ts`: new hook that tracks the autosave state and adds the leave-page warning
- `frontend/components/draft/lesson/save-status-indicator.tsx`: new toolbar indicator with Retry
- `frontend/components/draft/lesson/lesson-renderer.tsx`: autosave calls report their result; lock-lost banner; replaces the old "Changes saved automatically" line
- `frontend/tests/hooks/useSaveStatus.test.tsx, frontend/tests/components/draft/lesson-renderer-save-status.test.tsx`: new tests

## Motivation and Context

Autosave failed silently, so creators could lose work without knowing. Losing the lock turned the editor read-only with no explanation.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps:
  - `claude/ody-281-delete-spinners`, `claude/ody-471-preview-sync`, `claude/ody-879-flag-scroll-to-block`, `claude/ody-897-remove-mark-addressed`: `frontend/components/draft/lesson/lesson-renderer.tsx` (large file; expect conflicts)
- Saves still go through the existing `updateLesson` action; no action code changed.
- A droplet in review shows "In review, changes aren't saved" instead of a failure.

**How to test on dev**
1. Open a draft lesson and type → "Unsaved changes", then "Saving…", then "Saved just now".
2. In browser dev tools, set the network to offline and type → "Save failed" and a Retry button show; back online, click Retry → it saves.
3. With unsent changes, try to close the tab → the browser asks to confirm.
4. Open the same lesson in a second browser as another editor so the lock is taken → the first editor shows the "You lost the editing lock" banner and goes read-only.
5. Open a droplet that is in review → the indicator says changes aren't saved, no error.

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
