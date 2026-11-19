title: The onboarding quiz saves a new student's answers and refreshes their recommendations (ODY-964)
risk: 🔴 needs review
kind: feature
---

Adds the `saveOnboarding` server action: it checks the signed-in student's quiz answers, saves their name, bio, time zone and learner profile, marks them onboarded, and refreshes their recommendations.

**Base:** this PR targets `claude/ody-963-onboarding-quiz-steps` (stacked).

## Test on dev

Not wired to a page yet, so the Jest tests (`frontend/testing/lib/onboarding-action.test.ts`) cover it; ODY-958 makes it visible.

## Security

- Guard: `requireRole([])` at `frontend/lib/actions/onboarding.ts:48`; the only export is guarded, nothing added to the allowlist.
- Session-only user: the id comes from the gate (`:50`); the action takes no user id from the client.
- Validation: `onboardingAnswersSchema.safeParse` (`:52`) and `UpdateUserInfoSelfSchema.safeParse` (`:57`) run before any write.
- No answer logging: the only `console.error` calls log a status code (`:38`) or an error name (`:92`); tests assert no answer appears in logs.
- `firstTime: false` is written last, so a failed save shows the quiz again. Writes are idempotent, so retrying is safe.
- I used one checked PUT instead of `updateUserInfo` and `setTimeZone`, since `updateUserInfo` never inspects the response and would report a failed write as success.

## Overlaps

- ODY-963 (base), and ODY-958, 965 and 966 stack on this.
- ODY-953's `saveLearnerProfile` (called, unchanged).

**Review fixes:** also clears the global `users` and `authors` caches so other people see the new name; cache clearing now runs inside the `try`, so a failure returns `{ ok: false }`; duplicate topic ids are removed before saving; tests now assert all four tags, the exact learner-profile input, the number of writes per failure, and that a failed cache clear or thrown fetch returns an error.

**Suggested reviewer:** `JaylenZeng`

## Checklist

- [x] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [ ] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [x] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
