title: Save lesson quiz attempts for Mentor (ODY-939)
risk: 🔴 careful
kind: feature
---
Every Check Answer on a lesson quiz (multiple choice, true/false and open-ended) now saves one row on the server with the student, lesson, question, right or wrong and the attempt number, never the answer text, and nothing reads it yet.

**Careful:** New `quiz-attempt` schema, a new `"use server"` export (`recordQuizAttempt`, which takes the user from the session and rejects a client user id) and new per-student data; check `backend/src/lib/quiz-attempt.ts` (enrollment 403, 500 a day cap, dedupe on `submitId`) and that there is no REST read or write route besides `POST /quiz-attempts/record`.
**Test on dev:** As an enrolled student answer a quiz question wrong, then right → two rows in the Strapi admin (attempts 1 and 2, `correct` false then true, no answer text), and the quiz still shows its result if Strapi is down.
**Overlaps:** `claude/ody-469-quiz-label-html` and Awad's bug-fix bundles 1 and 2 (`quiz-question.tsx` import block, one-line conflict); ODY-888/890 submit path (`onSubmit` in `quiz-question.tsx`, behaviour unchanged); ODY-937 retention (no sweep yet, its job will add `quiz-attempt`).
**Suggested reviewer:** AwadBuisir10 (security audit, server actions)

## Checklist

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.

Security review passed (docs/reviews/ODY-939.md); its fixes N1, N2, N5, N7-N9 are in on 5c932379.
