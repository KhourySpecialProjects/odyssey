title: Bug fixes: Explore, Activity and two small security fixes (ODY-472, ODY-496, ODY-473, ODY-623, ODY-719)
risk: 🔴 careful
kind: bug
---
Small bug fixes bundled for one review. Each fix is its own commit.

### ODY-472 · Buttons and links can't be dragged into text boxes

Buttons, droplet link cards and links could be dragged into text boxes and the editor, leaving junk there; they no longer drag.

**Test on dev:** Try dragging a droplet card or a button into the lesson editor → nothing is dropped; the card still opens when clicked.

### ODY-496 · Explore droplet cards line up in each row

Explore cards had uneven heights; they now share a row height, with long titles clamped and the footer pinned to the bottom.

**Test on dev:** Open Explore with a mix of short and long titles → cards in a row are the same height and footers line up.

### ODY-473 · Favorited droplets show in Activity without enrolling

Favorited droplets were missing from Activity unless you had enrolled in them; they now appear either way.

**Test on dev:** Favorite a droplet you haven't started, then open Activity → it appears in the favorites list.

### ODY-623 · Stop printing secrets to container logs on start

The frontend start script used to print the secrets file, the secrets folder listing and the PostHog variables to the logs; it no longer does.

**Careful:** This is the secret-handling script `set_env.sh`; check that only the print lines were removed and the lines that load the values still run.

**Test on dev:** Start the frontend container and read its logs → no secrets file contents or PostHog values appear, and the app still starts.

### ODY-719 · Lesson lock conflict returns only the holder's name and id

When a lesson is locked, the 409 response could include every field of the user holding the lock; it now returns only their id, first name and last name.

**Careful:** This is a backend response that could expose another user's data; check that the 409 path now goes through `toLockHolder`.

**Test on dev:** Open a lesson as a second user while another user holds the lock → the 409 response has `lockedBy` with just `id`, `firstName` and `lastName`.

**Overlaps:** `claude/ody-527-tailwind-classes` (`droplet-tile.tsx`); `claude/ody-154-notes-close-animation` and `claude/ody-543-a11y-learner-path` (`globals.css`); `claude/integration-2026-11-10` also contains these files.

**Suggested reviewer:** `AwadBuisir10`

**Replaces:** the separate branches `claude/ody-472-no-drag-paste`, `claude/ody-496-explore-cards-align`, `claude/ody-473-favorites-in-activity`, `claude/ody-623-set-env-no-secrets`, `claude/ody-719-lock-holder-fields`, which won't get their own PRs.

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
