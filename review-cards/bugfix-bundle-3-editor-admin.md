title: Bug fixes: draft editor and admin (ODY-471, ODY-872, ODY-917, ODY-546)
risk: 🟡 test on dev
kind: bug
---
Small bug fixes bundled for one review. Each fix is its own commit.

### ODY-471 · Preview waits for autosave and shows the latest edits

Clicking Preview could show stale content; it now waits for the pending autosave, saves a pending lesson title and refreshes the lesson, so you see your latest edits.

**Test on dev:** Type in a lesson and click Preview straight away → the preview shows the text you just typed.

### ODY-872 · Review panel dock no longer says "dialog" on wide screens

On screens 1280px wide or more, the review panel dock wrongly had `role=dialog` on first load; it no longer does.

**Test on dev:** Open the review panel on a wide screen → it works as before; a screen reader doesn't announce it as a dialog.

### ODY-917 · Add User and Droplet Analytics dialogs show one close button

The Add User and Droplet Analytics admin dialogs showed two close buttons; they now show one.

**Test on dev:** Open Admin → Users → Add User → the dialog has a single X that closes it.

### ODY-546 · Admin reports buttons and gaps match other admin tables

The row buttons and gaps in the Admin reports table were a slightly different size from the other admin tables; they now match.

**Test on dev:** Open Admin → Reports → the row buttons and gaps look like those in Admin → Droplets.

**Overlaps:** `claude/ody-211-delete-draft` and `claude/ody-616-components-lint` (`draft/sidebar.tsx`, `sidebar.test.tsx`); `claude/ody-281-delete-spinners`, `claude/ody-535-draft-save-feedback`, `claude/ody-879-flag-scroll-to-block` and `claude/ody-897-remove-mark-addressed` (`draft/lesson/lesson-renderer.tsx`); ODY-211 (#1327) also edits `frontend/components/draft/sidebar.tsx`. `claude/integration-2026-11-10` already contains these files (integration branch).

**Suggested reviewer:** `AwadBuisir10`

**Replaces:** the separate branches `claude/ody-471-preview-sync`, `claude/ody-872-dock-dialog-role`, `claude/ody-917-admin-dialog-close`, `claude/ody-546-dashboard-spacing`, which won't get their own PRs.

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
