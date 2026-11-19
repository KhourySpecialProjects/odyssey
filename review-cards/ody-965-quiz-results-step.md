title: The onboarding quiz ends with three picks to start, plus an optional tour (ODY-965)
risk: 🟡 skim
kind: feature
---

After the four steps save, the quiz dialog shows "You're all set" with up to three recommended droplets (each with its reason and a Start button), an optional link to the Odyssey tour, and "Go to my Activity".

**Base:** this PR targets `claude/ody-958-onboarding-quiz-trigger` (stacked).

## Test on dev

1. As a student who gets the quiz, finish all 4 steps: "You're all set" shows up to 3 picks with reasons and doesn't vanish.
2. Start on a pick enrolls you and opens it.
3. The tour link opens Introduction to Odyssey without enrolling you.
4. Go to my Activity closes the quiz on Activity, and it doesn't come back on reload.

## How Results survives the save's refresh

Saving revalidates tags, so Next applies a fresh layout tree where `needsOnboarding` is false and the loader used to return `null`, unmounting the quiz. The loader now always mounts the host for signed-in users (with `show={false}` and no topics once onboarded), and the host keeps its own phase state (`quiz` → `saving` → `results` → `done`), which React preserves across the refresh. The host's `router.refresh()` is gone; Start and Finish navigate instead.

## Overlaps

963, 964 and 958 (base); 966 stacks on this.

## Suggested reviewer

`JaylenZeng`

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [ ] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
