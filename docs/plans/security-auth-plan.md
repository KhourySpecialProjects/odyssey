# Security plan: Server Action auth (ODY-501) and ODY-644 / 646 / 649 / 652 / 625

Measured on `develop` at `3b1783f4` (2026-11-10). Plan only, no code changes. Owners: Jaylen Zeng (ODY-501, 499, 282, 660), Awad Buisir (ODY-640).

## 0. How this was measured

- Inventory: ran the guard test's own `findUseServerFiles` + `scanFile` (`frontend/testing/security/server-action-auth-guard.test.ts`) over `lib/` and `app/`, joined with `PENDING_AUTH` (`testing/security/server-action-auth-allowlist.ts`).
- "guarded" means the export's body calls `requireRole`/`withAuth`. That test does not check roles or ownership (see `docs/agent/server-action-auth.md`, "Known limits").
- The R/W and "session" columns below come from a grep heuristic: does the body call `getCurrentUser`, and does it write with `method: POST/PUT/DELETE` or S3. Re-check each export by hand when you implement it.
- Slack and Linear tools weren't connected in this run, so ticket states come from git only. Check Linear before claiming anything.

## 1. Inventory

**208 exports in 28 `"use server"` files. 69 are guarded and 139 are in `PENDING_AUTH`. None is unguarded and unlisted**, because the guard test enforces that. `PUBLIC_ACTIONS` is empty. The audit counted 13/16 unguarded in `lib/actions.ts` and 118/163 elsewhere. Today it's 13/16 and 126/192: new exports were added guarded, but few old ones were converted.

### Per ticket (PENDING_AUTH)

| Ticket  | Pending | Writes with no session check at all (heuristic)                                                                                                                                                                                       | Writes with a session check only (no ownership/role)                                                                                                                                                        |
| ------- | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ODY-503 |      19 | `createGroup`, `updateGroup`, `deleteGroup`, `updateGroupMembers` (+ `add`/`remove`/`changeGroupMemberRole` wrappers), `assignDropletDueDate`, `assignPlaylistDueDate`, `enrollUsers`                                                 | `archiveGroup`                                                                                                                                                                                              |
| ODY-504 |      25 | `deepDeleteDroplet`, `createNewTag`, `updateDropletAverageRating`, `revalidateLesson`, 4 AI imports (`autoFormatSlides`, `customPromptAI`, `expandLessonContent`, `splitTextWithAI`)                                                  | `archiveDroplet`, `createDroplet`, `duplicateDroplet`, `favoriteDroplet`, `completeLesson`, `markLessonAsComplete`                                                                                          |
| ODY-505 |      11 | `createPlaylist`, `updatePlaylist`, `deletePlaylist`                                                                                                                                                                                  | `archivePlaylist`                                                                                                                                                                                           |
| ODY-506 |      25 | `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `cancelFriendRequest`, `removeFriend`, `BlockUser`, `unblockUser`, 6 `create*Announcement`                                                                         | `giveKudos`; `markAnnouncementRead`/`Unread` have a local `assertAnnouncementOwnership` but no gate                                                                                                         |
| ODY-507 |      26 | `createEnrollmentDirect`, `createEnrollmentFromEmail`, `enrollInPlaylist`, `enrollInVoyageDirect`, `checkAndCompleteVoyageNode`, `checkDropletVoyageNode`, `changeEnrollmentRating`, `updateViewedLessons`, `recordMissingCompletion` | `createEnrollment`, `deleteEnrollment`, `updateCompletionDate`, `updateEnrollmentFirstTime`, `togglePlaylistEnrollment`, `markVoyageNodeComplete` (takes optional `authorizedUserId`), `unenrollFromVoyage` |
| ODY-508 |       9 | `createNote`, `updateNoteContent`, `updateNotePosition`, `deleteNote` (all take a client `authorizedUserId`)                                                                                                                          | —                                                                                                                                                                                                           |
| ODY-509 |      12 | — (all reads: the full user directory, admin stats, retention, droplet analytics)                                                                                                                                                     | —                                                                                                                                                                                                           |
| ODY-510 |      13 | `uploadImage`, `deleteImage`, `uploadDataset`, `deleteDataset`, `saveNotebookContent`, `createAccessRequest`, `deleteAccessRequest`, `createCreationRequest`, `deleteCreationRequest`, `createBugReport`                              | —                                                                                                                                                                                                           |

The reads on each row (for example `fetchFriendshipsById(userId)` and `getUserDueDates(authorizedUserId)`) take a client-chosen user id. Each one leaks that user's data, so it counts as HIGH.

### Per file (total / guarded / pending)

| File                                                          | Total | Guarded | Pending | Ticket  |
| ------------------------------------------------------------- | ----: | ------: | ------: | ------- |
| `lib/actions.ts`                                              |    16 |       3 |      13 | ODY-510 |
| `lib/requests/groups.ts`                                      |    21 |       2 |      19 | ODY-503 |
| `lib/requests/droplet.ts`                                     |    20 |       6 |      14 | ODY-504 |
| `lib/requests/enrollment.ts`                                  |    15 |       0 |      15 | ODY-507 |
| `lib/requests/authorized-user.ts`                             |    14 |       5 |       9 | ODY-509 |
| `lib/requests/feed.ts`                                        |    13 |       1 |      12 | ODY-506 |
| `lib/requests/voyage-enrollment.ts`                           |    13 |       4 |       9 | ODY-507 |
| `lib/requests/friends.ts`                                     |    12 |       0 |      12 | ODY-506 |
| `lib/requests/lesson.ts`                                      |     9 |       5 |       4 | ODY-504 |
| `lib/requests/voyage.ts`                                      |     9 |       5 |       4 | ODY-505 |
| `lib/requests/playlist.ts`                                    |     7 |       0 |       7 | ODY-505 |
| `lib/requests/notes.ts`                                       |     7 |       1 |       6 | ODY-508 |
| `lib/requests/highlights.ts`                                  |     6 |       3 |       3 | ODY-508 |
| `lib/requests/lesson-lock.ts`                                 |     5 |       4 |       1 | ODY-504 |
| `lib/requests/dataset.ts`                                     |     3 |       2 |       1 | ODY-504 |
| `lib/requests/playlist-enrollment.ts`                         |     2 |       0 |       2 | ODY-507 |
| `lib/requests/{admin-stats,analytics,droplet-analytics}.ts`   | 1+1+1 |       0 |       3 | ODY-509 |
| `lib/kudos.ts`                                                |     1 |       0 |       1 | ODY-506 |
| `lib/requests/galleries.ts`                                   |     1 |       0 |       1 | ODY-504 |
| `lib/actions/auto-format-slides.ts`, `lib/import/*-ai.ts` (3) |     4 |       0 |       4 | ODY-504 |
| `lib/requests/reviews.ts`                                     |    21 |      21 |       0 | —       |
| `lib/requests/overview-scan.ts`                               |     5 |       5 |       0 | —       |
| `lib/requests/ai-scoring.ts`                                  |     2 |       2 |       0 | —       |

The scan doesn't cover the inline `"use server"` closure in `app/(editing)/draft/d/[slug]/page.tsx` (ODY-504 audits it by hand) or Route Handlers (`app/api/user-activity/[userId]/route.ts`, ODY-509).

## 2. Status table

| Ticket                    | Status                        | Evidence / what's left                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ODY-501                   | **Partly**                    | Done: the guards (`lib/auth/guards.ts`), the guard test and allowlist (this meets the "lint rule or review check" criterion), the test helper `testing/helpers/server-action-auth.ts`, and roles read from Strapi in `requireRole` (`require-role.ts:47`). Left: 139 pending exports, ownership checks, client-supplied ids and queries, and Jest coverage per HIGH export. ODY-487: parts merged (#1014 ODY-555, #1034 ODY-573), but `improvement/ody-487-stop-gzipping-strapi-responses` is still unmerged. Confirm in Linear whether ODY-487 is closed. ODY-282 (logging): no branch on origin.                                                          |
| ODY-503 groups            | **Not started**               | 19/21 pending. Only `refreshUserGroups` and `setGroupArchivedForMe` are guarded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ODY-504 droplets/lessons  | **Partly**                    | Guarded: `updateDroplet`, `togglePresentationEnabled`, `setDropletHidden`, `publishDraftToOriginal`, `updateDropletFunFact`, `updateDropletLearningObjective`, lesson writes, lesson-lock, dataset writes. 25 pending (table above).                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ODY-505 playlists/voyages | **Partly**                    | Voyage writes are guarded (`createVoyageWithNodes`, `updateVoyageWithNodes`, `publishVoyage`, `deleteVoyage`, `archiveVoyage`). `playlist.ts` is 0/7. Voyage reads are pending (`getVoyagesAdmin`, `getArchivedVoyagesForAuthor(authorizedUserId)`, `getVoyageBySlug({ includeDrafts })`).                                                                                                                                                                                                                                                                                                                                                                  |
| ODY-506 social            | **Partly** (barely)           | Only `createSystemBroadcast` is guarded. All of `friends.ts` (12), feed, and kudos are pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ODY-507 enrollments       | **Partly**                    | Guarded: `enrollInVoyage`, `claimNodeForUser`, `claimVoyageDropletNode`, `unclaimVoyageDropletNode`. 26 pending. The ODY-640 branch moves the average-rating recompute into `changeEnrollmentRating`.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ODY-508 notes/highlights  | **Partly**                    | #1110 guarded `getNotesByAuthorizedUserAndLesson`, and highlight writes are guarded. Left: `updateNoteContent` (`notes.ts:116`), `updateNotePosition`, `deleteNote` and `createNote` let anyone edit or delete any note. Reads by a client-chosen user id are also pending.                                                                                                                                                                                                                                                                                                                                                                                 |
| ODY-509 users/admin       | **Partly**                    | Writes are guarded (`createAuthorizedUser`, `createBatchAuthorizedUsers`, `updateUserInfo`, `deleteAuthorizedUser`, `resolveEmailsToUserIds`). Reads are open: `fetchAuthorizedUsers` (`authorized-user.ts:115`) is imported by the client components `components/ui/user-multi-select.tsx` and `components/draft/metadata/authors.tsx`, so the whole directory is one POST away. `getAdminDashboardStats`, `getRetentionData` and `getDropletAnalytics` are also pending. The `user-activity` route is unaudited.                                                                                                                                          |
| ODY-510 actions.ts        | **Not started**               | 13/16 pending. Only `setTimeZone`, `deleteReport` and `approveCreationRequest` are guarded. `approveCreationRequest` still ignores the `{ok:false}` from `claimNodeForUser`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ODY-511 client queries    | **Not started** on develop    | The ODY-640 branch adds `testing/security/client-query-actions-guard.test.ts` and an allowlist with 8 ODY-511 entries: `getDropletById`, `getDropletBySlug`, `getDroplets`, `getEnrollmentsByAuthorizedUser`, `getGroupByID`, `getHighlights`, `getNotesByAuthorizedUserAndLesson`, `getPlaylists`.                                                                                                                                                                                                                                                                                                                                                         |
| ODY-640                   | **In review**, not on develop | Branch `bug/ody-640-security-client-imported-server-actions-accept-caller-chosen` (15 files, +679/−335, last merged develop on 11-10). It touches `enrollment.ts`, `notes.ts`, `PHProvider.tsx`, `lesson-renderer.tsx`, `notes-bar.tsx`, `rating-stars.tsx` and `docs/agent/server-action-auth.md`.                                                                                                                                                                                                                                                                                                                                                         |
| ODY-644 uploads           | **Not started**               | `saveNotebookContent` (`actions.ts:864`): no gate, and `existingUrl` falls back to a raw key at `actions.ts:915-917`. `uploadImage` (`:48`): no gate, `ContentType: file.type` at `:74`, no size cap. `deleteImage` (`:152`): any `${root}/<name>`. `deleteDataset` (`:97`): bucket-prefix check only, no ownership. `uploadDataset` (`:1010`): extension allowlist and a 25 MB cap, but `ContentType: file.type` at `:1052` and no `Content-Disposition`.                                                                                                                                                                                                  |
| ODY-646 admin/session     | **Partly**                    | Actions read roles from Strapi (900 s cache). Pages don't. `admin/layout.tsx:12-13` uses `getCurrentUser().roles`, which come from the JWT and are set once at sign-in (`lib/auth/options.ts:181`). None of the 8 `admin/**/page.tsx` files checks anything. `requireRole` never reads `isEnabled`, and `PROFILE_FIELDS` in `user-populates.ts` doesn't fetch it. The jwt callback re-checks only the account id every 5 min (`options.ts:31,188-205`), never roles or `isEnabled`. No `session.maxAge` is set, so NextAuth's 30-day default applies. The middleware covers `/admin` (`middleware.ts:46-47`) but only requires a token.                     |
| ODY-649 bug report        | **Not started**               | The mutation is built by string interpolation (`actions.ts:373-376`; `description`, `title`, `sessionUrl` at `:370`). The Anthropic rate limit is skipped when there's no session (`:304-306`). `sessionUrl` is never validated. There is no server-side zod parse.                                                                                                                                                                                                                                                                                                                                                                                         |
| ODY-652 page gates        | **Partly**                    | Done: the public lesson page checks that the lesson belongs to the droplet (`app/(droplets)/d/[slug]/[lessonSlug]/page.tsx:74`, `lib/lesson-access.ts`, a28da4b7). Left: the published/hidden gate (`lesson-access.ts` says "ODY-660 adds its visibility gate"). The draft lesson page (`app/(editing)/draft/d/[slug]/[lessonSlug]/page.tsx:58`) has no auth and no membership check and relies on the draft layout. `app/(groups)/g/management/page.tsx:43-50` lets any CC/Faculty/Admin edit any group. Missing from the matcher (`middleware.ts:42-51`): `/new`, `/draft`, `/settings`, `/review`, `/my-content`, `/g`, `/faculty`, `/creation-request`. |
| ODY-625 PostHog           | **Not started** on develop    | `providers/PHProvider.tsx:29-33` sends name/email/username, and `:40` calls `reset()` on every unauthenticated render. `PHProvider.tsx:64` doesn't set `autocapture` or masking. There are extra `posthog.init` calls in `enroll-button.tsx:30`, `quiz-question.tsx:65`, `open-ended-quiz-question-block.tsx:46` and `lesson-renderer.tsx:190`, plus `components/providers/posthog-provider.tsx:34` (`autocapture: true`), which is imported nowhere (dead code). The ODY-640 branch rewrites the identify block but still sends the PII.                                                                                                                   |
| ODY-721 / ODY-499         | **Not started**               | `fetchAPI` is still in `lib/utils.ts:79`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## 3. Rules every PR follows

- Use the guard from `docs/agent/server-action-auth.md`: `withAuth(roles, handler)` for actions shaped `{ok,error,data}`, and `requireRole` otherwise, mapping `gate.error` to the action's existing shape so callers don't change.
- The caller is always `user.id` from the gate. A client-supplied user id is either removed (preferred) or checked with `assertOwner(id, user)`, which lets SysAdmin bypass.
- Check ownership on a fresh read (`cache: "no-store"`) of the record by numeric id, then write to the entity you fetched. Never trust a client `documentId`.
- Exports that are only internal helpers (for example `create*Announcement`, `updateDropletAverageRating`, `calculateDropletAverageRating`, `enrollInPlaylist`, `enrollUsers`) move out of the `"use server"` file into a server-only module and stop being exports. Delete their `PENDING_AUTH` entries. This shrinks the attack surface better than gating them.
- Delete each `PENDING_AUTH` entry in the PR that converts it. Add no new `PENDING_AUTH` entries. A `PUBLIC_ACTIONS` entry needs a reviewer-checkable reason.
- Tests: use `describeServerActionAuth` for each HIGH export with three cases, (a) unauthenticated, (b) wrong role or non-owner, (c) authorized. Denied cases assert that no `fetch` or `revalidateTag` ran. New files go in `testing/requests/<area>-auth.test.ts`.
- Budget: about 1,000 changed lines per PR, tests included. The estimates below include tests.
- Run `/ci quick` before handing a PR to the developer. Agents don't push feature branches or open PRs (CLAUDE.md).

## 4. PR list (risk order)

| #   | PR                                                  | Tickets                         | Est. lines | Depends on                             | Squad-safe                                   |
| --- | --------------------------------------------------- | ------------------------------- | ---------: | -------------------------------------- | -------------------------------------------- |
| 1   | Upload and S3 actions                               | ODY-644, ODY-510                |       ~750 | ODY-282 check (actions.ts)             | Yes, with an Opus review                     |
| 2   | Bug report and requests                             | ODY-649, ODY-510                |       ~800 | PR 1 (same file, merge sequentially)   | Yes                                          |
| 3   | Friends writes and reads                            | ODY-506                         |       ~900 | —                                      | Yes                                          |
| 4   | Notes and highlights                                | ODY-508                         |       ~500 | ODY-640 merged (notes.ts overlap)      | Yes                                          |
| 5   | User directory and admin analytics                  | ODY-509                         |       ~700 | —                                      | Yes                                          |
| 6   | Admin pages and `isEnabled` in requireRole          | ODY-646 (part A)                |       ~500 | —                                      | Yes                                          |
| 7   | Groups writes and management page                   | ODY-503, ODY-652 (g/management) |       ~950 | —                                      | Yes                                          |
| 8   | Groups reads and due dates                          | ODY-503                         |       ~600 | PR 7                                   | Yes                                          |
| 9   | Feed and kudos                                      | ODY-506                         |       ~750 | PR 3 (friend announcements)            | Yes                                          |
| 10  | Enrollments (enrollment.ts, playlist-enrollment.ts) | ODY-507                         |       ~950 | ODY-640 merged (enrollment.ts overlap) | Yes                                          |
| 11  | Voyage enrollment                                   | ODY-507                         |       ~700 | PR 10                                  | Yes                                          |
| 12  | Playlists and voyage reads                          | ODY-505                         |       ~650 | —                                      | Yes                                          |
| 13  | Droplet/lesson writes and AI imports                | ODY-504                         |       ~950 | —                                      | Yes, with an Opus review (deepDeleteDroplet) |
| 14  | Droplet/lesson/gallery/dataset reads                | ODY-504                         |       ~700 | PR 13                                  | Yes                                          |
| 15  | Page gates and middleware matcher                   | ODY-652                         |       ~500 | ODY-660 (visibility rule)              | Partly; matcher needs a live check           |
| 16  | Session revalidation and maxAge                     | ODY-646 (part B)                |       ~350 | PR 6                                   | **No: Opus + human**                         |
| 17  | PostHog PII                                         | ODY-625                         |       ~400 | ODY-640 merged (PHProvider overlap)    | Yes for code; human for PostHog admin        |
| 18  | Client-supplied Strapi queries                      | ODY-511                         |       ~900 | ODY-640 merged, PRs 4/7/10/12/14       | Yes                                          |

### PR 1: Upload and S3 actions (ODY-644, ODY-510)

- Files: `lib/actions.ts`, a new `lib/s3-keys.ts` (pure: parse and validate keys), a new `lib/file-sniff.ts` (magic bytes), `lib/validations/dataset.ts`.
- `uploadImage`: `requireRole([])`. Sniff the magic bytes and allow only png/jpeg/webp/gif (no SVG). Set `ContentType` from the sniffed type, cap at 5 MB, and sanitize the file name to `[A-Za-z0-9._-]`.
- `deleteImage`: `requireRole([])`. The key must match `^${root}/<uuid>-[^/]+$`. Ownership: allow only if the URL is still referenced by a droplet/lesson the caller can write (`checkDropletContentWrite`), or the caller is SysAdmin (see Q3).
- `uploadDataset` and `deleteDataset`: gate with `requireRole([])` plus `checkDatasetWrite` / `checkDropletContentWrite` on the droplet. Set the content type from the extension map, add `ContentDisposition: attachment`, and sniff xlsx (PK zip) and json (parse).
- `saveNotebookContent`: gate with `requireRole([])`. `existingUrl` must start with `${bucketUrl}/${root}/notebooks/` and match `<uuid>.ipynb`, with no raw-key fallback. The lesson that references it must be writable by the caller (`checkLessonWrite`). This means adding a `lessonId` param; update the caller in the notebook block editor.
- Tests: for each of the 5 exports, unauthenticated / non-owner / authorized. Also cover a raw-key `existingUrl` (rejected), SVG and HTML disguised as PNG (rejected), 6 MB (rejected), and a traversal or foreign-prefix key on delete (rejected).
- Allowlist: remove 5 `lib/actions.ts#…` entries.
- Human follow-up: the terraform bucket policy and CORS (section 7).

### PR 2: Bug report and requests (ODY-649, ODY-510)

- `createBugReport`: `requireRole([])` (Q2), zod-parse `reportSchema` server-side, and accept `sessionUrl` only if it matches `^https://(us|eu)\.posthog\.com/project/\d+/replay/[A-Za-z0-9-]+`. Build the Linear call with GraphQL `variables` (`mutation($input: IssueCreateInput!)`). Always rate-limit by the gate user.
- `createAccessRequest`: this is used by people who can't sign in (`components/requests/access-request-form.tsx`). Add it to `PUBLIC_ACTIONS` with a reason. Rate-limit by IP (`headers()` `x-forwarded-for`, the first hop from the ALB), zod-parse the input, and dedupe by email.
- `deleteAccessRequest`, `fetchCreationRequests`: `requireRole([SysAdmin])`.
- `createCreationRequest`: `withAuth([])`. The requester is always `user.id`.
- `deleteCreationRequest`: SysAdmin, or the requester via `assertOwner`.
- `fetchCreationRequestByUser(userId)`: drop the param and use `user.id`, or keep it with `assertOwner`.
- `createAuthorizedUserWithState`: add its own `requireRole([SysAdmin])`, because the inner guard doesn't count for the guard test.
- `approveCreationRequest`: honor the `{ok:false}` from `claimNodeForUser`.
- Tests: for each HIGH export, 3 cases. Also: a description containing `\"`, `\\` and `}` produces one issue with a literal title (assert the `variables` payload), and a bad `sessionUrl` is dropped.
- Allowlist: remove 8 entries and add 1 `PUBLIC_ACTIONS` entry.

### PR 3: Friends (ODY-506)

- `friends.ts` has 12 exports. All writes become `withAuth([])` or `requireRole([])`.
- The acting user is `user.id`, and `requester`/`userId` params are deleted. `sendFriendRequest(requesteeId)`.
- `accept`/`reject`/`cancel`/`unblock`/`BlockUser`/`removeFriend`: load the friendship by numeric id fresh and require `user.id` to be the correct side (requestee to accept or reject, requester to cancel, blocker to unblock).
- Reads (`fetchFriends`, `fetchFriendshipsById`, `fetchSuggestionsById`, `getSentRequestIds`): self only (`assertOwner`). `fetchFriendshipsByUserIds`: SysAdmin, or only ids that include the caller.
- Update the callers (about 24 files import friends/groups). Keep signature changes minimal: drop the user args.
- Tests: 3 cases × 7 writes plus 4 reads.

### PR 4: Notes and highlights (ODY-508), after ODY-640

- `createNote`, `updateNoteContent`, `updateNotePosition`, `deleteNote`: `requireRole([])`. Load the note fresh and run `assertOwner(note.authorizedUser.id, user, { bypassRoles: [] })`. Drop the `authorizedUserId` param and use `user.id` for the cache tag.
- `getAllNotesByUser`, `getNotesByDroplet`, `getHighlightsByDroplet`, `getAllHighlightsByUser`, `getHighlightsByAuthorizedUserAndLesson`: self, or SysAdmin.

### PR 5: User directory and admin analytics (ODY-509)

- `fetchAuthorizedUsers`: the client pickers (`user-multi-select.tsx`, `authors.tsx`) need a narrow replacement: `searchAuthorizedUsers` returning `id, firstName, lastName, profilePhoto` with no email for non-admins. Gate the full list with `requireRole([SysAdmin])`.
- `fetchAuthorizedUsersMetadata`, `getAdminDashboardStats`, `getRetentionData`: SysAdmin. Drop the client `filters`/`sort` from Metadata.
- `getDropletAnalytics`: an author of the droplet, or SysAdmin/Faculty.
- `fetchContentCreators`, `fetchContentEditors`, `fetchWebsiteCreators`: `requireRole([])`, returning public fields only. Website creators feed a public page, so check that `/website-creators` renders signed-out; if it does, make the read a server-only module instead.
- `fetchIsAuthorizedUser(email)`, `getAuthorizedUserByEmail`, `getAuthorizedUsersByEmails`: move to a server-only module. They're used by `signIn`, `requireRole` and `cached.ts`, and must not be callable actions. If a client imports them, replace that use.
- `app/api/user-activity/[userId]/route.ts`: self, or SysAdmin/Faculty.

### PR 6: Admin pages and `isEnabled` (ODY-646 part A)

- `lib/requests/user-populates.ts`: add `isEnabled` to `profile`. `lib/auth/require-role.ts`: return `unauthenticated` when `user.isEnabled === false`. Treat null/undefined as enabled until Q5 is answered.
- `app/(general)/admin/layout.tsx` and each of the 8 `admin/**/page.tsx` files: `const gate = await requireRole([SysAdmin]); if (!gate.ok) notFound();`. This reads roles from Strapi, not the JWT.
- Add a page-gate test that statically scans `app/(general)/admin/**/page.tsx` for `requireRole(`, so new admin pages can't skip it.
- Tests: `require-role` with a disabled user, and each admin page with an unauthenticated / non-admin / admin caller.

### PR 7: Groups writes and the management page (ODY-503, ODY-652)

- `createGroup`: `withAuth([CC, Faculty, SysAdmin])`. The creator is `user.id`, so drop the `authorizedUserId` param.
- `updateGroup`, `deleteGroup`, `archiveGroup`, `updateGroupMembers`, `assignDropletDueDate`, `assignPlaylistDueDate`: fresh-load the group by numeric id and `assertOwner([creator.id, ...admins.map(id)], user)`. Pass only `groupId`, never the client `Group` object (`archiveGroup`, `assign*` take `group: Group` today).
- `addGroupMembers`, `removeGroupMembers`, `changeGroupMemberRole`, `enrollUsers`: make them non-exported helpers behind `updateGroupMembers`, or guard them the same way.
- `app/(groups)/g/management/page.tsx:43-50`: allow only the creator, a group admin, or SysAdmin.

### PR 8: Groups reads (ODY-503)

- `getManagedGroups(authorizedUserId)`, `getUserGroups(authorizedUserId)`, `getUserDueDates(authorizedUserId)`: self, or SysAdmin.
- `getGroupBySlug`, `getGroupBySlugV2`, `getGroupByID`, `getGroupDueDate(s)`: a member, manager, admin or creator of the group, or SysAdmin.
- Drop the caller-chosen `populate`.

### PR 9: Feed and kudos (ODY-506)

- Move the 6 `create*Announcement` functions to a server-only `lib/requests/feed-writes.ts` (not `"use server"`). They're called only from server code after the caller is already gated. Verify that with grep.
- `markAnnouncementRead` and `Unread`: wrap them in `requireRole([])` and keep the ownership helper.
- `fetchAnnouncements(page, roles)`: take the roles from the gate, not the client.
- `fetchUserAnnouncements(userId)`: self, or a friend's public feed (Q6).
- `giveKudos`: gate with `requireRole([])`, require that the caller is enrolled, and use the `announcementId` from a fresh read.

### PR 10: Enrollments (ODY-507), after ODY-640

- `createEnrollment`, `deleteEnrollment`, `updateViewedLessons`, `updateCompletionDate`, `updateEnrollmentFirstTime`, `recordMissingCompletion`, `changeEnrollmentRating`, `togglePlaylistEnrollment`: the gate user must own the enrollment (fresh read, no bypass).
- `createEnrollmentDirect(authorizedUserId, …)`, `createEnrollmentFromEmail(…, email)`, `enrollInPlaylist(playlistId, userId)`: make them server-only helpers (used by group enrollment), or gate them with SysAdmin or a group manager.
- `calculateDropletAverageRating`: make it a non-exported helper.
- Reads: `getEnrollmentsByAuthorizedUser`, `getEnrollmentByUserAndDroplet`, `getEnrollByID` are self or SysAdmin. `getEnrollmentsForGroupMembers` needs the caller to manage the group. `fetchEnrollmentMetadata` is SysAdmin.

### PR 11: Voyage enrollment (ODY-507)

- `enrollInVoyageDirect`, `checkAndCompleteVoyageNode(dropletId, userId)`, `checkDropletVoyageNode(dropletId, userId)`: become server-only helpers or use the gate user.
- `markVoyageNodeComplete`: drop the optional `authorizedUserId`, or `assertOwner` it.
- `unenrollFromVoyage`: the gate user.
- Reads (`getVoyageEnrollment`, `getVoyageEnrollmentsByUser`, `getVoyageNodeCompletions`): self. `getVoyageEnrollmentsForGroupMembers`: a group manager.

### PR 12: Playlists and voyage reads (ODY-505)

- `createPlaylist`: `withAuth([])`. The owner is the gate user.
- `updatePlaylist`, `deletePlaylist`, `archivePlaylist`: fresh read plus `assertOwner(playlist owner(s))`. `archivePlaylist` takes an id, not a `Playlist` object.
- `getPlaylistById` and `getPlaylistBySlug`: public playlists, or the owner or SysAdmin for private ones. `getPlaylists`: force `isPublic: true` unless the caller is SysAdmin (ODY-511 overlap).
- `getVoyagesAdmin`: SysAdmin/Faculty. `getVoyageBySlug({ includeDrafts })`: drafts only for authors or admins. `getArchivedVoyagesForAuthor`: self.

### PR 13: Droplet and lesson writes, plus AI imports (ODY-504)

- `deepDeleteDroplet`: author or SysAdmin, plus `checkDropletUpdate` (freeze). This is the highest-impact delete, so it gets an Opus review.
- `archiveDroplet(droplet)`: switch to an id param and the author check. `createDroplet` and `duplicateDroplet`: CC/Faculty/SysAdmin (match the `/new` page), with the source readable by the caller. `createNewTag`: CC/Faculty/SysAdmin/CE. `favoriteDroplet`: `requireRole([])` plus the gate user.
- `completeLesson` and `markLessonAsComplete`: the enrollment's owner.
- `updateDropletAverageRating`: becomes non-exported once ODY-640 lands (only `changeEnrollmentRating` calls it). `revalidateLesson`: delete it or gate it.
- AI imports (4): `requireRole([CC, Faculty, SysAdmin, CE])` plus the existing `checkRateLimit`, keyed by the gate user and roles. This closes the "rate-limit tiers read session roles" gap.
- `lesson-lock.ts#getCurrentAuthorizedUserId`: make it a non-exported helper.

### PR 14: Droplet and lesson reads (ODY-504)

- `getDraftDroplets` and `getInReviewDroplets`: SysAdmin/CE.
- `getDropletById`, `getDropletBySlug`, `getDroplets`, `getRandomFunFactDroplet`, `getLessonBySlug`, `getGalleryBySlug`, `getDatasetsByDropletId`: split them. Server Components use a server-only module (not callable). The `"use server"` export keeps a fixed query and returns published, non-hidden droplets only, unless the caller is an author or reviewer.
- `getFavoritedDropletIds(userId)`: self.
- Hand-audit the inline closure in `app/(editing)/draft/d/[slug]/page.tsx`.

### PR 15: Page gates and the middleware matcher (ODY-652), after ODY-660

- `app/(editing)/draft/d/[slug]/[lessonSlug]/page.tsx`: repeat the draft layout's author/CE/SysAdmin check (through a shared `lib/auth/draft-access.ts`) and require `draft.lessons` to include `lesson.id`.
- `app/(droplets)/d/[slug]/[lessonSlug]/page.tsx`: consume ODY-660's visibility rule from `lessonAccess`, so a published, non-hidden droplet is visible to everyone, and otherwise only to an author or reviewer.
- `middleware.ts` matcher: add `/new/:path*`, `/draft/:path*`, `/settings/:path*`, `/review/:path*`, `/my-content/:path*`, `/g/:path*`, `/faculty/:path*`, `/creation-request/:path*`.
- Verify the redirect for each route in a running app, signed-out and signed-in. A squad can write it; a person or an Opus run with Playwright verifies it.

### PR 16: Session revalidation (ODY-646 part B). Opus or human

- `lib/auth/options.ts` jwt callback: extend the 5-minute re-check to fetch `roles` and `isEnabled` fresh (`no-store`). When the account is disabled, drop `token.user`, which makes `session()` throw and signs the user out. Refresh `token.user.roles` too.
- Set `session: { maxAge: 8 * 60 * 60, updateAge: 15 * 60 }` (Q4).
- Risks: RSC requests can't write the cookie (see the comment at `options.ts:20-31`), every request re-runs the lookup, and existing tokens need to keep working. It needs a live Strapi and two browsers (demote, disable) to verify.

### PR 17: PostHog (ODY-625), after ODY-640

- `providers/PHProvider.tsx`: call `identify(id, { role })` only, with no name, email or username. Call `reset()` only on a real logout: track the previous status in a ref and reset on the authenticated-to-unauthenticated transition, or from the sign-out handler. Configure `init` with `mask_all_text: true`, `mask_all_element_attributes: true` and a `before_send` that rewrites `/prof/<username>` to `/prof/:username` in `$current_url`, `$pathname` and `$referrer`. Set `person_profiles: "identified_only"`.
- Remove the 4 component `posthog.init` calls and use `usePostHog()` instead. Delete the dead `components/providers/posthog-provider.tsx`; this needs Awad's approval (CLAUDE.md: no deletes without it).
- Tests: extend `tests/providers/PHProvider.test.tsx` (identify payload, no reset on first load) and `testing/requests/posthog.test.ts`.

### PR 18: Client-supplied Strapi queries (ODY-511), after ODY-640 and the area PRs

- Remove the 8 `CLIENT_QUERY_ACTIONS` entries. Each export takes a fixed query, or callers move to a narrow action or server-only reads.
- Sweep the other exports that still take `filters`/`populate`/`fields`/`sort` and that the area PRs didn't fix (`getEnrollByID`, `fetchEnrollmentMetadata`, `getGalleryBySlug`, `getPlaylistById`, `getLessonBySlug`).

## 5. Squad vs Opus or human

- **Squad-safe** (Sonnet implements, Haiku inventories callers and tests): 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 17 (code), 18. Each is a mechanical guard plus ownership check with mocked tests.
- **Squad with an Opus review**: 1 (S3 key, ownership and sniffing logic is easy to get subtly wrong) and 13 (`deepDeleteDroplet`, create/duplicate role sets).
- **Opus or human**: 16 (jwt/session; needs a live Strapi and real sign-in), and the live verification of 15 (middleware). Q1 and Q3 decisions come from the developers.
- **Haiku chores**: after each PR, re-run the inventory script (section 0) and list each changed export's callers (`grep -rn "<name>(" components app lib`). Verify the list before using it.

## 6. Coordination and merge order

| Item                                        | Owner  | Overlap                                                                                                                                                                                                                                                           |
| ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ODY-501 parent                              | Jaylen | Every PR here is an ODY-501 sub-ticket. Get Jaylen's okay on the split before a squad claims any of them.                                                                                                                                                         |
| ODY-640 (in review)                         | Awad   | `enrollment.ts`, `notes.ts`, `PHProvider.tsx`, `server-action-auth.md`. PRs 4, 10, 17 and 18 wait for it.                                                                                                                                                         |
| ODY-282 logging                             | Jaylen | `lib/actions.ts`. There's no branch on origin yet. Ask before PRs 1 and 2 and land them first, since they're the highest risk.                                                                                                                                    |
| ODY-499 / ODY-721 (fetchAPI to server-only) | Jaylen | Touches the imports of every request file. Land it before PR 3, or freeze it until PR 14. See Q7.                                                                                                                                                                 |
| ODY-660 isHidden (in progress)              | Jaylen | PR 15 and the reads in PR 14.                                                                                                                                                                                                                                     |
| ODY-487 parts                               | —      | `improvement/ody-487-stop-gzipping-strapi-responses` (backend `config/middlewares.ts`) has no overlap. ODY-501 said to start after ODY-487; two parts merged, so confirm in Linear.                                                                               |
| `claude/*` branches on origin               | —      | `ody-261`, `-471`, `-473`, `-527`, `-719` (backend lesson lock), `-872`, `-878`, `-888`, `-914`, `-917`. None touches the files above, except that `ody-473` (`favorited-droplet-grid.tsx`) reads favorites, a minor overlap with PR 14 `getFavoritedDropletIds`. |

**Merge order:** ODY-640, then 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, then 15 (after ODY-660), 16, 17, 18. PRs 3, 5, 6, 12 and 13 touch separate files and can run in parallel. Merge sequentially only where the same file is touched (1→2, 7→8, 10→11, 13→14).

## 7. Human-only tasks

- **ODY-644 terraform** (`terraform/s3.tf`; agents can't touch it). Deny `s3:PutObject` without the app role. Restrict CORS to the app origins. Make the bucket policy serve `${root}/*` as read-only. Consider `block_public_policy` (now `false` at `s3.tf:33`) behind the CDN. Add response headers on the CDN: `X-Content-Type-Options: nosniff` for all uploads, and `Content-Disposition: attachment` for datasets.
- **ODY-644 cleanup**: list the existing objects under `${root}/` with `text/html` or `image/svg+xml` content types, and review or delete them.
- **ODY-625 PostHog admin**: delete the stored name/email/username person properties (or the persons), create a separate dev2 project key and swap the `NEXT_PUBLIC_POSTHOG_KEY` env var in the dev2 ECS task (env change, not in the repo), get a privacy-office sign-off on session replay and autocapture, and set the project's data retention.
- **Deploy notes**:
  - PR 16 signs out disabled users and shortens sessions, so announce it.
  - PR 6 makes disabled accounts lose action access within 900 s (the `getCachedUser` TTL).
  - PR 2 needs `LINEAR_API_KEY` unchanged and adds IP rate-limits behind the ALB. Confirm that `x-forwarded-for` holds the client IP.
  - Rotate `LINEAR_API_KEY` after PR 2 if there's any sign of injection in Linear history.

## 8. Open questions (recommended answers)

1. **Q1 (Jaylen): Is this PR split the ODY-501 plan, and may a squad claim PRs 1–5 now?** Recommended: yes, as separate sub-ticket PRs, with Jaylen reviewing each. PRs 1 and 2 go first even before ODY-282, because they're unauthenticated writes.
2. **Q2 (Awad): Must bug reports work signed-out?** Recommended: no. Require a session (`requireRole([])`); signed-out users use `/request-access`. That removes the anonymous Anthropic and Linear spend completely.
3. **Q3 (Awad and Jaylen): Ownership for image and notebook keys.** Recommended: key-pattern validation plus a write check on the droplet or lesson that references the URL. Add no new Strapi "upload" type now; open a follow-up to track ownership if orphans matter.
4. **Q4 (Jaylen): Session length.** Recommended: `maxAge` 8 h, with a roles and `isEnabled` re-check every 5 min in the jwt callback (reusing `ACCOUNT_ID_RECHECK_MS`).
5. **Q5 (Jaylen): Is `isEnabled` null for legacy users?** Recommended: treat only an explicit `false` as disabled, and backfill `true` in Strapi before PR 6 merges.
6. **Q6 (Awad): Can friends read each other's feed (`fetchUserAnnouncements`)?** Recommended: self, plus accepted friends, plus SysAdmin.
7. **Q7 (Jaylen): ODY-499/721 timing.** Recommended: land the fetchAPI move first (it's mechanical) and rebase this series on it. The server-only module is also where the helpers made non-exported in PRs 3, 5, 9, 10 and 13 belong.
8. **Q8 (Awad): May PR 17 delete the unused `components/providers/posthog-provider.tsx`?** Recommended: yes. Nothing imports it, and it carries `autocapture: true`.
