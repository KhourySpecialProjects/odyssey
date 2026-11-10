title: Overview scan lesson flag links now scroll to the flagged block (ODY-879)
risk: 🟡 test on dev
---
## Description

A lesson flag's "Go to lesson" link now adds `?block=<id>`, and the lesson page scrolls to that block and flashes it.

**How it affects Odyssey:** Creators and reviewers following a flag from the Overview scan page: they land on the flagged block, not the top of the lesson.

**Files**
- `frontend/hooks/use-scroll-to-block.ts`: new hook: finds the block, scrolls, flashes (skips motion if reduced-motion is on)
- `frontend/components/draft/lesson/lesson-renderer.tsx`: calls the hook
- `frontend/lib/overview-scan/view.ts`: adds `?block=` to the flag link
- `frontend/testing/**`: hook and view tests

## Motivation and Context

The flag link only opened the lesson, so the creator had to hunt for the block the flag was about.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: ody-878-scan-fingerprint (`frontend/lib/overview-scan/view.ts` and its test); ody-281-delete-spinners, ody-471-preview-sync, ody-535-draft-save-feedback, ody-897-remove-mark-addressed (`frontend/components/draft/lesson/lesson-renderer.tsx`)
- The hook gives up quietly after 5 seconds, and a v1 (non-BlockNote) lesson has no such block, so it stays at the top.

**How to test on dev**
1. Run an Overview scan on a draft that has a flag on a lesson block → flag shows with "Go to lesson".
2. Click the link → the lesson opens and scrolls to the flagged block, which flashes briefly.
3. Open a lesson URL with no `?block=` → no scrolling or flash.
4. Turn on reduced motion in the OS and repeat step 2 → jumps without animation.

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
