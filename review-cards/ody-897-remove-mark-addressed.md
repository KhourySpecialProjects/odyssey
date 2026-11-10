title: Remove 'Mark addressed' from review comments; creators reply instead (ODY-897)
risk: 🔴 careful
---
## Description

Removes the Mark addressed button, its notes and counts from review comments, plus the `markAddressed` server action. Creators answer a comment by replying.

**How it affects Odyssey:** Creators see no Mark addressed button, "marked addressed" note or addressed counts. Reviewers no longer see "The creator marked this addressed." Affects the lesson and overview review panels.

**Files**
- `frontend/lib/requests/reviews.ts`: deletes `markAddressed` and its helpers
- `frontend/hooks/use-sent-feedback.ts`: drops the addressed handling
- `frontend/components/draft/review/*`: button, note and counts removed (comment card, strips, layers, overview feedback, section comments)
- `frontend/lib/review-comments.ts, frontend/types/index.d.ts`: addressed fields removed
- `backend/src/lib/review-workflow.ts`: carry-over no longer copies `addressedAt`
- `docs/agent/*.md`: docs updated
- `tests`: deleted `reviews-addressed.test.ts`; other tests updated

## Motivation and Context

Mark addressed duplicated what a reply does, and added states reviewers had to read. Replying is now the one way to answer.

**Merge notes**
- Depends on / stacked on: nothing
- Overlaps: ody-878-scan-fingerprint, ody-915-prompt-saved-by (`docs/agent/backend-architecture.md`); ody-879, ody-281, ody-471, ody-535 (`frontend/components/draft/lesson/lesson-renderer.tsx`); ody-488, ody-718 (`frontend/testing/contract/strapi-query-catalog.ts`); ody-615-lib-types-lint (`frontend/types/index.d.ts`)
- Removes an exported `"use server"` function (`markAddressed`); no unguarded exports were added.
- `addressedAt` stays in the Strapi schema, unused, for one release. Old marked comments keep the value but nothing shows it.
- Behaviour change: submitting a new round no longer copies an old addressed mark.

**How to test on dev**
1. As a creator, open a draft with sent reviewer feedback → no Mark addressed button on any comment, and no addressed note or count.
2. Reply to a comment → the reply appears in the thread.
3. As the reviewer, open the same comment → no "creator marked this addressed" line; you can still resolve it.
4. Submit the draft for another review round → unresolved comments carry over, with no addressed mark.
5. Check the overview feedback and section comments panels the same way.

## Screenshots (if appropriate):

<!-- add a screenshot from dev -->

## Checklist:

<!--- Go over all the following points, and put an `x` in all the boxes that apply. -->

- [ ] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [ ] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason.
