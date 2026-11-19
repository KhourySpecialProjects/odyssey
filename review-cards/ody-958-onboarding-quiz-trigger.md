title: New students and students who haven't finished a droplet get the onboarding quiz instead of the welcome popup (ODY-958)
risk: 🟡 skim
kind: feature
---

Shows the onboarding quiz (not the old first-visit popup) to new sign-ups and to students with no completed droplet other than the welcome one; it can't be closed or skipped, and nobody is auto-enrolled in "Introduction to Odyssey" any more.

**Base:** this PR targets `claude/ody-964-save-onboarding` (stacked).

## Test on dev

1. Sign in as a new student, or one with no completed droplet: the quiz shows and can't be closed (no close button, Escape and outside clicks do nothing).
2. Finish all 4 steps: it saves, disappears and doesn't come back on reload.
3. No enrollment in "Introduction to Odyssey" is created.
4. A student with a completed droplet never sees it.

## Unused now

The first-visit popup files (`components/first-time/first-visit-popup.tsx` and `first-visit-popup-loader.tsx`), left in place.

## Overlaps

- ODY-963 and ODY-964 (base); ODY-965 and ODY-966 stack on this.

**Suggested reviewer:** `JaylenZeng`

## Checklist

- [x] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [x] All new and existing tests passed.
- [ ] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
