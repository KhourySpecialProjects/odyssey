Verdict: ship after fixes

# Review: ODY-211 delete fixes (PR #1327)

Commits reviewed on `origin/claude/ody-211-delete-draft`:

- `1cabb45c` — `checkDropletDelete`: authors may delete only unpublished drafts.
- `fc049c32` — `POST /api/droplets/:id/deep-delete`: deletes a droplet and its lessons in one transaction, re-checking `inReview` and `status` under `lockDroplet` when `authorOnly` is true.

Line numbers refer to `fc049c32`.

**What I ran.**

- Frontend: `review-freeze`, `droplet-auth`, `droplet-coverage`, `droplet` and the `Strapi-Response-Format` guard. 5 suites, 233 tests, all pass.
- Backend: `tests/api/droplet-delete.test.js` and `no-entity-service`. 12 tests, all pass, on SQLite.
- A throwaway backend test (not committed). With no token, `POST /deep-delete` returns 403. With a bogus bearer it returns 401. The droplet is untouched in both cases.

Both CodeRabbit findings are fixed for the common case:

- An author (Content Creator or Faculty) can no longer delete a published droplet. The frontend refuses it, and so does the backend under the lock.
- A failed delete rolls back.

One gap is left in the race fix (S1). The shared-lesson behaviour (S2) is old, but it is cheap to fix now.

## Blocker

None.

## Should fix

### S1. A System Admin or Content Editor who authors the droplet skips the in-review re-check

- **Where:** `frontend/lib/requests/droplet.ts:289-294` and `backend/src/lib/droplet-delete.ts:35`.
- **What's wrong:** `authorOnly` is `!privileged`, so it depends only on role. The frontend freeze rule also depends on authorship. `checkDropletWrite` calls `isFrozenFor(roles, inReview, isAuthor)`. `isReviewerFor` is false for any author while the droplet is in review, whatever their role (`frontend/lib/review-roles.ts:28-39`, "No author reviews their own droplet"). So a System Admin or Content Editor who authors the droplet is frozen by the frontend check. But they send `authorOnly: false`, and the backend never re-checks `inReview` for them.
- **Failure scenario:**
  1. A System Admin co-authors a draft. `checkDropletDelete` passes because the draft is not in review.
  2. A co-author's submit-for-review commits before the `deep-delete` transaction takes its lock.
  3. The backend skips the check because `authorOnly` is false. It deletes the in-review droplet and its lessons, and with them the open review's anchor.

  This is CodeRabbit finding (2), still open for privileged authors. The window is small, but this commit says the race is closed.
- **Fix:** The two rules depend on different facts, so send two flags:
  - `refuseInReview`: the author freeze, `isAuthor || !privileged`.
  - `refusePublished`: `!privileged`.

  `checkDropletDelete` already loads `ownerIds`, so it can return these flags. Then `deepDeleteDroplet` doesn't need to re-derive them. A single flag `authorOnly = isAuthor || !privileged` would be wrong. It would stop a System Admin from deleting their own published droplet, which the frontend allows. Add a backend case and a frontend case for "privileged author, in review → 409, nothing deleted".

### S2. Deleting a droplet also deletes lessons it shares with other droplets

- **Where:** `backend/src/lib/droplet-delete.ts:47-50`.
- **What's wrong:** Lessons are `manyToMany` with droplets (`backend/src/api/lesson/content-types/lesson/schema.json:48-53`). The loop deletes every lesson that is linked to the droplet. `deleteEditDraft` in the same lib (`backend/src/lib/publish-edit.ts:309-324`) already skips a lesson that has `droplets` other than the one being deleted.
- **How serious:** Low likelihood, high impact.
  - The app never creates shared lessons. `duplicateDroplet` and `duplicateLessonToDroplet` copy the lessons. So a shared lesson comes only from the Strapi admin or from legacy data.
  - If one exists, this PR makes the damage easier to reach. Any author can now delete their own draft from the sidebar (the `deleteDraft` action). That silently removes the lesson from the other droplet, which may be published. Students' progress on that lesson (`viewedLessons`) goes with it.
  - This is the old behaviour, documented as such in `docs/agent/backend-architecture.md:363`, so it shouldn't block the PR.
- **Fix:** The fix is about six lines, so I'd fold it into this PR rather than open a ticket for it.
  1. Populate `lessons: { fields: ['id'], populate: { droplets: { fields: ['id'] } } }`.
  2. Skip lessons with another droplet, as `deleteEditDraft` does. Report `lessonsDeleted` as the number actually deleted.
  3. Add a backend test: a lesson shared with a second droplet survives, and the second droplet still lists it.
  4. Update the doc line.

  If the team would rather keep this PR small, open a ticket and link it from the doc line.

## Nit

### N1. `authorOnly` is a client-asserted flag, so document it as trusted

- **Where:** `backend/src/api/droplet/controllers/custom-droplet.ts:144-155` and `docs/agent/backend-architecture.md:364`.
- **Exposure:** The route has no `config`, the same as `submit-review` and the other `custom-droplet` routes. Strapi's content-API auth therefore applies:
  - It needs an API token, or a users-permissions role granted `api::droplet.custom-droplet.deepDelete`.
  - No grant is seeded in code. Permissions live in the database, so I couldn't check the production roles.
  - Verified in tests: Public gets 403 and a bad bearer gets 401.
- **Why it isn't worse than today:** Anyone who can call it can send `authorOnly: false`. But anyone holding the frontend's full-access token can already `DELETE /api/droplets/:id` and `/api/lessons/:id`, so the flag adds no power.
- **Fix:** Extend the "Trust boundary" line to say the route trusts `authorOnly` (the Next.js action enforces `checkDropletDelete`). Also say that no users-permissions role should be granted `custom-droplet.*`. If S1 is fixed with two flags, the line should name both.

### N2. The role list is duplicated

- **Where:** `frontend/lib/requests/droplet.ts:289-293`.
- **What's wrong:** It re-lists System Admin and Content Editor. `review-freeze.ts` already has these as `WRITE_BYPASS_ROLES` / `hasBypass`. The role names are correct today and Faculty correctly counts as an author. But the two lists can drift apart, which is how S1-style mismatches happen.
- **Fix:** Export one helper from `review-freeze.ts`. The S1 fix would naturally have `checkDropletDelete` return the flags, which also removes the duplicate.

### N3. The backend tests don't exercise the lock

- **Where:** `backend/tests/api/droplet-delete.test.js`.
- **What's wrong:** The backend suite runs on SQLite, where `lockDroplet` is a no-op. The "refuses and deletes nothing" and rollback tests are real and pass. They prove refusal-before-delete and rollback when the final droplet delete throws after the lessons are deleted. But nothing exercises the lock or the post-lock re-read.
- **Why it's still correct:** `submitForReview` takes the same row lock (`backend/src/lib/review-workflow.ts:102-118`), so on Postgres the two serialize correctly.
- **Fix:** Optional. Add a test where a lesson delete (not only the droplet delete) fails mid-loop. Note in the PR that the lock is verified by reasoning and Postgres semantics, not by a test.

## Checked and fine

- **Server action privacy:** `deleteDropletRecord` is still a non-exported function in the `"use server"` file (`frontend/lib/requests/droplet.ts:302`), so it isn't callable as an action. Its raw `fetch` spreads `STRAPI_RESPONSE_FORMAT_HEADER` and uses only `cache: "no-store"`, with no `next` option.
- **`duplicateDroplet` cleanup with `authorOnly: false`:** it only deletes the draft that the same call just created (status `draft`, not in review), so it grants nothing.
  - Pre-existing and outside these commits: `duplicateDroplet` itself only checks that the caller is signed in. It doesn't check rights on the original. Worth a separate look.
- **Transaction:**
  - Every read and delete runs inside `strapi.db.transaction`. The lock comes before the re-read. `lockDroplet` uses `forUpdate()` (Postgres `SELECT … FOR UPDATE`).
  - Strapi 5 returns `id` and `documentId` even when `fields` is restricted. The passing test (`lessonsDeleted: 2`, rows gone) confirms the lesson and droplet `documentId`s are present.
  - Neither the lesson nor the droplet lifecycles define delete hooks. Nothing runs outside the transaction.
  - Entity Service is not used.
- **Error mapping:**
  - 409 → `REVIEW_FROZEN_ERROR`, and the sidebar shows `REVIEW_FROZEN_MESSAGE` (`content-action-button.tsx:121-130`).
  - 403, 404 and 500 → "Failed to delete droplet."
  - The cache revalidation set is unchanged and runs only on success.
  - `DeleteDropletButton` ignores failures silently, but that is old behaviour. It is also only referenced by its test.
- **Status rule:** the status enum is `draft | edit | published`, so authors may delete `draft` and `edit`. That matches the backend and the tests.
