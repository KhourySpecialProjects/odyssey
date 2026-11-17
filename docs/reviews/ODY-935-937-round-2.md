# Review round 2: ODY-935 PR A and ODY-937 PR 1

Second review, 2026-11-17, against `origin/develop` at `563fac1`. First review: `docs/reviews/ODY-935-937.md`. Neither branch was changed.

- ODY-935: `9fba549` (fix on `e0fc4df`)
- ODY-937: `e19fb70` (fix on `de50714`)

## What I ran

| Branch  | Command                                         | Result                                                           |
| ------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| both    | `npm ci` (root, frontend, backend)              | ok                                                               |
| ODY-935 | `npx jest` (full frontend)                      | **2 suites, 3 tests fail** (935-N1); 534 suites, 8,848 pass      |
| ODY-935 | `npx tsc --noEmit`, `npm run lint` (frontend)   | clean; lint warnings only                                        |
| ODY-937 | `npm run build` (backend)                       | ok                                                               |
| ODY-937 | `npx jest` (full backend, real Strapi + SQLite) | 35 suites, 604 pass                                              |
| ODY-937 | `npx jest` (full frontend), `tsc`, `lint`       | 535 suites, 8,858 pass; tsc clean; 0 lint errors                 |
| ODY-937 | `JSON.parse` both schema files                  | both valid; `text` private + `maxLength: 20000`, `title` private |

Trust model, cron across ECS tasks, races and logging: by reading. Role permissions in each environment's DB: not checked.

---

## Branch 1: ODY-935 PR A

**Verdict: ship after fixes** (three red tests).

| First-review finding                    | Status                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| 935-M1 save failure reported as success | **Fixed.** A non-OK PUT returns `update_failed` and skips revalidation (tested). |
| 935-m1 switch role and focus ring       | **Fixed**, app-wide in `ui/switch.tsx`, but it breaks old tests (N1)             |
| 935-m2 help text                        | **Fixed.** It now covers prerequisites and viewed lessons (tested).              |
| 935-n1 "never sends name…" promise      | Not addressed here. It belongs in ODY-934.                                       |
| 935-n2 auto-save under "Save Changes"   | Partly fixed: the help text now says "Saved automatically".                      |

**Callers of `updateUserInfo` after the change.** None regresses.

- The admin users pages (`authorized-user.tsx`, `users-page-client.tsx`) already branch on `result.ok`. A failed PUT now shows their error toast instead of a false success.
- A missing user is still swallowed: `StrapiEntryNotFoundError` from `strapiEntryUrl` is still caught. Only a 404 from the PUT itself (row deleted mid-call) now returns `ok: false`, which is correct.

### New findings

**Major**

**935-N1. CI is red: making the switch a `role="switch"` breaks three existing tests.** `frontend/components/ui/switch.tsx:17`

- **What's wrong:** `tests/components/droplets/notes-filter.test.tsx:25` and `notes-container.test.tsx:69,83` call `getAllByRole("checkbox")` on `NotesFilter`, which renders `Switch`. They now find nothing.
- **Failure scenario:** `/ci` and GitHub CI fail on this branch, so it can't merge.
- **Smallest fix:** change those three queries to `getAllByRole("switch")`. Add a `switch.test.tsx` case for the role.

**Minor**

**935-N2. Three callers still ignore the result, so a failed save still looks saved there (pre-existing, now fixable).** `app/(general)/settings/social-forms.tsx:50,94,127`

- **What's wrong:** the `isPublic` switch (line 50) never reverts, "Profile photo removed" (line 94) always toasts success, and `first-visit-popup.tsx:61-62` carries on after a failed save.
- **Failure scenario:** a student makes their profile private while Strapi returns 500. The switch shows private and the profile stays public.
- **Smallest fix (follow-up, not a blocker):** revert and toast on `!ok` for `isPublic`, as `MentorPersonalizationToggle` does, and toast photo removal from `result.ok`.

---

## Branch 2: ODY-937 PR 1

**Verdict: ship after fixes.** Fix N1 before production. N2 can follow.

| First-review finding                         | Status                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 937-M1 retention not enforced                | **Fixed.** Daily cron; expired chats are not found (tested, real DB).                                    |
| 937-M2 text over REST, permissions in the DB | **Partly fixed.** Private fields, no core routes (tested); new routes still rely on DB permissions (N1). |
| 937-m1 invalid JSON                          | **Fixed** (tested)                                                                                       |
| 937-m2 orphans past 2,000 messages           | **Fixed** (batches until empty, orphan purge); see N4.                                                   |
| 937-m3 save/delete race                      | **Partly fixed** (N2)                                                                                    |
| 937-m4 chat continued across lessons         | **Fixed.** Lesson and kind are matched (tested).                                                         |
| 937-m5 cut-off lists and messages            | **Fixed** (`findAll` pages through every result)                                                         |
| 937-m6 chat start delays the answer          | **Partly fixed.** 1–2 Strapi calls instead of 5, still serial.                                           |
| 937-m7 `revalidateTag` during render         | **Fixed.** No purge or revalidation in `listMentorChats`.                                                |
| 937-n1 status thrown away                    | **Fixed.** The error now keeps method, path and status.                                                  |
| 937-n2 `maxLength`                           | **Fixed.** 20000 in the schema and the route.                                                            |

### Trust model

All 6 routes in `routes/custom-mentor-chat.ts` take `userId` from the query or body, have no `config`, no `auth: false` and no policy.

**What the source guarantees:**

- Every frontend caller passes the session user. `route.ts` uses `gate.user.id`, and every `mentor-chats.ts` export uses `requireRole([])` → `gate.user.id`. `chat-history.ts` is `server-only` and not `"use server"`, so a browser can't call it.
- In a fresh DB, no role is granted the `custom-mentor-chat.*` actions. An anonymous request gets 401/403 (tested for `GET /owned` only).
- Read-only API tokens can't reach the routes, because the actions aren't named `find`/`findOne`.

**What depends on the DB:** the routes are reachable by every full-access API token and by any Users & Permissions role an admin grants these actions. Same pattern as `custom-mentor-feedback.record`, but that only writes a rating; these read and delete any student's chats by id.

### New findings

**Major**

**937-N1. One permission tick exposes every student's chats, and the source doesn't stop it.** `backend/src/api/mentor-chat/routes/custom-mentor-chat.ts:4-9`

- **What's wrong:** if Public or Authenticated is granted these actions (e.g. "Select all" on Mentor-chat), `GET /api/mentor-chats/owned?userId=N` returns any student's titles and message text, and `DELETE` wipes them. Users & Permissions registration (`/api/auth/local/register`) is on by default unless turned off in the DB, so Authenticated is open to anyone, and `NEXT_PUBLIC_STRAPI_API_URL` puts the host in the browser bundle.
- **Failure scenario:** an admin ticks all Mentor-chat actions for Authenticated while setting up something else. A stranger registers, loops `userId=1..5000` and reads every Mentor question.
- **Smallest fix:** a global policy `backend/src/policies/service-token-only.ts` returning `ctx.state.auth?.strategy?.name === 'api-token'`, on all six routes (`config: { policies: ['global::service-token-only'] }`), plus a test that a registered user's JWT gets 403 even with the permission granted. Until then, check per environment that Public and Authenticated have no `custom-mentor-chat` action, and that Content Manager access to both types is Super Admin only (`private` doesn't hide fields in the admin panel).

**Minor**

**937-N2. A delete during a save can still leave the deleted chat's text for up to 30 days.** `backend/src/lib/mentor-chats.ts:159-162`, `:182-183`, `:205`

- **What's wrong:** the recheck closes the "chat already gone" case, not this order: `deleteChat` deletes the (zero) messages → `saveExchange` creates both, rechecks (chat exists) and updates → `deleteChat` deletes the chat. The new messages are orphans, and the orphan purge only takes those with `createdAt < cutoff`.
- **Failure scenario:** a student presses "Delete all chats" as an answer finishes. That answer stays stored for a month.
- **Smallest fix:** orphans are never legitimate (messages are created with their chat). Drop `createdAt: { $lt: cutoff }` at `:205` and run the orphan purge at the end of `deleteChat` too.

**937-N3. Deleting runs one query per row, serially.** `mentor-chats.ts:172-197`

- **What's wrong:** `removeAll` does one `delete` per message and per chat, plus a findMany per batch.
- **Failure scenario:** a student with 60 chats of 40 messages each triggers about 2,500 serial queries in one request. That can pass the ALB's 60-second timeout, so the UI reports a failure while deletion carries on.
- **Smallest fix:** `strapi.db.query(MENTOR_MESSAGE_UID).deleteMany({ where: { chat: { documentId } } })` per chat (Query Engine, not entityService).

**937-N4. The deletion tests can't fail on orphans.** `backend/tests/lib/mentor-chats.test.js` (the 105-message test and the first purge test)

- **What's wrong:** `messageCount(chat)` filters on `chat.documentId`. Once the chat is deleted, that is 0 whether or not its messages were deleted.
- **Failure scenario:** a regression that deletes the chat before its messages, which orphans all of them, still passes.
- **Smallest fix:** count all `MENTOR_MESSAGE_UID` rows before and after, or count by the message documentIds that were created.

**Nit**

- **937-n5. Cron:** the v5 shape (`cron: { enabled: true, tasks }`) is correct and the loops end on an empty batch. Every ECS task runs it at once; that is safe (deleting a gone row is a no-op), as is running in tests and dev. With no `tz`, 03:30 is container time (UTC on ECS); add `tz: 'America/New_York'` if local was meant. If a delete ever returns without removing its row, the loop never ends: stop when a batch repeats.
- **937-n6.** `custom-mentor-chat.ts:37` and `cron-tasks.ts` log the whole `error`. No current path puts text in an error; log `name` and `message` only so that stays true.
- **937-n7.** An answer over 20,000 characters gets a 400 and silently isn't saved. Truncate in `saveMentorExchange` or confirm `max_tokens` keeps it under.
- **937-n8.** Only `GET /owned` is tested without a token; loop that test over all six routes.

### Checked and fine

- **Privacy:** the 6 new log lines contain counts, `errorName` or a fixed message, never text.
- **Default routes:** every core route returns 404, and sanitize strips `text` and `title` (tested).
- **`after()`:** the save is in try/catch after the response: a Strapi failure can't break or delay the answer.
- **Strict REST:** body and query keys are allow-listed.
- **Strapi v5 rules:** relation writes use `documentId` and filters use numeric `id`. No `entityService`, and `cache` and `next` are never combined.
