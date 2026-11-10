title: Show one close button in the Add User and Droplet Analytics dialogs (ODY-917)
risk: 🟡 test on dev
---
## Description

Removes the extra hand-made close button from the Add User and Droplet Analytics admin dialogs and raises the built-in one above the content.

**How it affects Odyssey:** Admins: those two dialogs now show a single X in the top right instead of two.

**Files**
- `frontend/components/admin/users/create-user.tsx`: remove extra close, raise built-in
- `frontend/components/admin/droplets/droplet-analytics-modal.tsx`: same
- `frontend/tests/components/admin/*`: one-close-button tests

## Motivation and Context

The dialog already has a built-in close button, so these two showed a doubled X.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: none
- Uses the selector `[&>button:last-child]:z-20` to lift the built-in button.

**How to test on dev**
1. As an admin, open Users and click Add User → one X in the top right, and it closes the dialog.
2. Open Droplet Analytics for a droplet → one X, and it closes the dialog.
3. Check both in dark mode → the X is visible and clickable.

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
