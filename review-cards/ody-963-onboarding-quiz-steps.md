title: New students answer four short quiz steps about themselves (ODY-963)
risk: 🟡 check
kind: feature
---

Adds the onboarding quiz components: profile, goal, areas and topics steps with a progress bar, Back/Next, per-step validation and accessible errors. The caller passes `onSubmit` and gets back a pending state and any save error.

## Test on dev

Not wired to any page yet, so there is nothing to click on dev. The Jest tests cover each step's rules, Back, focus, chips, errors and failed saves; ODY-958 makes the quiz visible.

## Overlaps

- ODY-964, ODY-958, ODY-965 and ODY-966 stack on this PR (save action, trigger, results, settings).
- ODY-953: uses its goal/area types and `INTEREST_NOTE_MAX`; topics carry numeric tag ids for `saveLearnerProfile`.

## Suggested reviewer

JaylenZeng

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [ ] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
