title: Students can see and change their learning interests in Settings (ODY-966)
risk: 🔴 needs review
kind: feature
---

Adds a "Learning interests" section to the Settings Profile page where a student sees their saved goal, areas and topics, edits them and saves, which refreshes their recommendations.

**Base:** this PR targets `claude/ody-965-quiz-results-step` (stacked).

## Test on dev

1. As a student who took the quiz, open Settings: Learning interests shows your goal, areas and topics.
2. Change them and save: a success message shows, and the new answers are there after a reload.
3. Your recommendations on Activity change to match.
4. As a student who never took the quiz, the section is empty and needs a goal, an area and a topic before it saves.

## Security

- Guard: `requireRole([])` at `frontend/lib/actions/onboarding.ts:114` in the new `saveLearningInterests`; nothing added to the allowlist.
- Session-only user: the id comes from the gate (`:116`); the action takes no user id from the client.
- Validation: `goalStepSchema.merge(areasStepSchema).merge(topicsStepSchema)` runs `safeParse` (`:118`) before any write.
- No answer logging: the only `console.error` (`:133`) logs an error name; the Settings page logs only an error name too. Tests assert no answer appears in logs.
- Topic ids are de-duplicated before `saveLearnerProfile`; the recommendations tag is revalidated inside the `try`.

## Why not `saveOnboarding`

It validates and rewrites first name, last name and time zone, which this section doesn't edit and a student without a saved time zone would fail.

## Overlaps

- ODY-963, 964, 958 and 965 (base).
- The Settings page (`frontend/app/(general)/settings/page.tsx`).

**Suggested reviewer:** `JaylenZeng`

## Checklist

- [x] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [x] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
