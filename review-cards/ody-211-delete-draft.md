title: Authors can delete their own draft; deletes are now permission-checked (ODY-211)
risk: 🔴 careful
---
## Description

Adds a "Delete draft" button to the editor sidebar. The author types the droplet's name to confirm, and the draft and its lessons are deleted. The delete request itself now checks who is asking.

**How it affects Odyssey:** Creators see the new button in the draft editor sidebar, only on their own unpublished draft and not while it is in review. Admins and Content Editors can also delete through the existing path.

**Files**
- `frontend/components/draft/metadata/content-action-button.tsx`: new `deleteDraft` action with a type-the-name confirmation
- `frontend/components/draft/sidebar.tsx`: shows the button for authors of an unfrozen draft
- `frontend/lib/requests/droplet.ts`: `deepDeleteDroplet` now calls `requireRole` and the same write check as `updateDroplet`; internal cleanup uses a private unchecked delete
- `frontend/testing/security/server-action-auth-allowlist.ts`: removes `deepDeleteDroplet` from the allowlist (ODY-504)
- `frontend/testing/requests/droplet-auth.test.ts, frontend/tests/components/draft/*.test.tsx`: tests

## Motivation and Context

Creators had no way to remove a draft they started by mistake. Making that button safe also meant `deepDeleteDroplet` had no permission check at all, so the second commit adds one.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: `ody-471-preview-sync` (`sidebar.tsx`, `sidebar.test.tsx`); `ody-616-components-lint` (`content-action-button.tsx`, `sidebar.tsx`); `ody-615-lib-types-lint` (`droplet.ts`); `ody-718-dead-request-functions` (the allowlist file).
- Deletes data and changes a `"use server"` export, so please read `deepDeleteDroplet` carefully. It is now guarded by `requireRole([])` plus `checkDropletContentWrite`, and its allowlist entry is gone.
- Behaviour change: authors are refused while the droplet is in review.
- `duplicateDroplet` cleanup now calls the private `deleteDropletRecord`, so it skips the auth check on purpose (the caller was already checked).

**How to test on dev**
1. As a creator, open your own draft in the editor → a red "Delete draft" button is in the sidebar.
2. Click it, type a wrong name → the confirm button stays disabled or does nothing.
3. Type the exact name and confirm → toast "Draft deleted" and you land on `/my-content`; the draft and its lessons are gone.
4. Open a published droplet, and a draft that is in review → no Delete draft button for the author.
5. As a different non-admin user, try deleting someone else's draft through the app → refused.

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
