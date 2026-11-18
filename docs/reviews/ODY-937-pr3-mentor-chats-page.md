# ODY-937 PR 3 review: Mentor chats page

Branch `claude/ody-937-mentor-chats-page` at `4f5a6903`. Reviewed `git diff fec21cd8 a2be5cc1` in full; in `4f5a6903` only the `mentor-panel.tsx` conflict resolution and the new `?mentorChat` tests.

**Verdict: ship after fixes** (two Majors, both small)

Access control holds: list, read and delete all take the user from `requireRole` and never from the client; the search filter is AND-ed under `authorizedUser`, so another user's titles can't leak through results, timing or error text. A crafted `?mentorChat=<someone else's id>` gets the backend 404, then `not_found`, then a "Couldn't open that chat" toast, which is harmless. A malformed id fails `chatIdSchema` and gets the same toast. The header path is sound: Koa joins repeated headers with `, `, so the comma check catches them; the client encodes commas as `%2C`; lengths are checked after decoding; Strapi's `$containsi` escapes `%`/`_` with an ESCAPE clause on every client, Postgres included. The 400 messages don't echo the term, and `strapi::logger` prints only method, URL and status.

## Major

**M1. `?q=` in the page URL sends the search term to PostHog, tied to the student's identity.** `frontend/components/feed/mentor-chats-page.tsx:63,77-84`. `PHProvider` (`frontend/providers/PHProvider.tsx:64`) starts posthog-js 1.234 with defaults, so autocapture is on, and every autocaptured click and every `$pageleave` carries `$current_url = location.href`. The user is `identify`'d with name and email. Scenario: a student searches "failing CS2500" and then clicks a row to expand it. PostHog now stores `…/activity/mentor-chats?q=failing%20CS2500` against their email. The same URL lands in browser history and autocomplete. Every debounced `router.replace` also sends an RSC GET with `?q=` through the ALB, so it reaches any access log there (I couldn't read terraform to check whether ALB logging is on). This defeats the stated reason for the `X-Mentor-Search` header. A search box doesn't need a shareable URL, so **`?q=` should go.** Smallest fix: keep the term in component state only. Debounce `input` into a `term` state, call `listMentorChats({ q: term })`, and delete the `useSearchParams`/`router.replace` code and the page's Suspense wrapper. This also removes M2.

**M2. Characters typed while the `?q=` navigation is loading get erased.** `mentor-chats-page.tsx:87` (`useEffect(() => setInput(q), [q])`). Scenario: the student types "join" and pauses, so `router.replace(?q=join)` starts. They type "s" before the RSC round trip lands. When `q` becomes "join", the effect resets the box to "join", and the debounce effect then sees `input === q` and never searches "joins". **Verified by running** a scratch Jest test (since deleted) that mocks `useSearchParams` to change `q` after the replace: the box went `"joins"` → `"join"`, with one `replace` call in total. Fix: dropping `?q=` (M1) removes this. If `?q=` stays, track the last value pushed in a ref and sync only when `q` differs from it (Back, or an external link).

## Minor

**m1. Focus goes to `<body>` after Cancel, Escape or a failed delete.** `mentor-chats-page.tsx:328-354`. The AlertDialog is controlled and has no `AlertDialogTrigger`, so Radix has nothing to return focus to. `heading.focus()` runs only after a successful delete. **Verified by running** a scratch RTL test: `document.activeElement` was `BODY` after Cancel and after a failed delete. Fix: on `AlertDialogContent`, set `onCloseAutoFocus={(e) => { e.preventDefault(); (deletedRef.current ? heading.current : triggerRef.current)?.focus(); }}`, where `triggerRef` is the button that opened the dialog. Then the success path can drop its `setTimeout`.

**m2. `role="status"` is still used, against the claim "none anywhere".** `mentor-chats-page.tsx:212` (result count) and `:287` ("Loading conversation…"). These are harmless today, because the footer's `[role="status"]` count (`components/droplets/footer.tsx:152`) runs only on lesson pages. But the claim and the house rule (`mentor-sheet.tsx:229`, `mentor-hint.tsx:10`) say not to use it. Fix: keep `aria-live="polite"` and drop the `role` on both.

**m3. A NUL in the term gets a 500 on Postgres.** `backend/src/api/mentor-chat/controllers/custom-mentor-chat.ts:27-34`. `readSearch` accepts `%00`, and Postgres rejects `\u0000` in text ("invalid byte sequence"). With `?q=` in the URL, the link `/activity/mentor-chats?q=%00` reaches it: the student sees "Couldn't load your chats" and `strapi.log.error` records the failure. The backend tests run on SQLite, so they can't catch it. Fix: `if (/[\u0000-\u001f\u007f]/.test(q)) return null;` in `readSearch`, plus a 400 test case. Found by reading.

**m4. A failed `?mentorChat` load isn't announced inside the phone sheet.** `mentor-panel.tsx` (4f5a6903, the linked-chat effect) calls `toast.error(...)`. The cherry-picked fix added `fail()` because the toast sits outside the phone's modal sheet. Fix: move the effect below `fail` and call `fail("Couldn't open that chat")`, which keeps the conflict resolution consistent with `openChat`.

**m5. "Delete all chats" during a search deletes chats the student can't see.** `mentor-chats-page.tsx:175-183, 336-337`. With "joins" showing 1 of 40 chats, a student can reasonably read "Delete all" as "all of these". The dialog says "all your Mentor chats", which is accurate but easy to skim past. Fix: when `searching`, have the description say "This deletes all N of your chats, not only the ones matching ‘q’" (or hide the button while searching).

## Nit

- `droplet-lesson-wrapper.tsx:175-180`: on a lesson where Mentor is unavailable or gated, `?mentorChat` is never consumed and stays in the URL. If the lesson later opens, the panel opens with that chat, which is acceptable. Consider stripping the param in the `!available` case too.
- The page tests mock the four Server Actions. Search through real Strapi is covered only by the backend tests, on SQLite. No test covers `DropletLessonWrapper` opening the panel from the param, or the M2 race.

## Checked and fine

- Stale searches: the `latest` counter discards older responses, and Server Actions run serially anyway. Deletes call `revalidateTag(CACHE_TAGS.mentorChats(userId))` (`lib/mentor/chat-history.ts:165,174`), and the Next fetch-cache key includes headers, so each term gets its own cache entry under one tag.
- The empty state ("No saved chats yet") and the no-results state ("No chats match ‘q’") are distinct. `continueHref` returns null when the droplet or lesson was deleted, and it reads current slugs, so a renamed slug still resolves. The route `/d/[slug]/[lessonSlug]` exists.
- `?mentorChat`: the panel mounts only when `mentorKept`, and the wrapper opens it only when `available` (Mentor on and lesson gate open), so a lesson the student can't open never loads the chat. Under StrictMode, `linkedChat` and the `replaceState` make the second run a no-op. `defaulted.current = true` is set before the default-load effect runs, and `loadToken` stops a later load or stream from being overwritten. The new tests cover both.
- Fit: the Activity layout's sign-in guard and `loading.tsx` apply, styling is Tailwind v3 classes only, the backend uses Document Service only, a `q` query key gets 400, and `documentId` is used for reads, deletes and links.

## Verified by running vs by reading

Run at `4f5a6903`, after `npm ci` in root, frontend and backend:
- `npx jest tests/components/feed/mentor-chats-page.test.tsx tests/components/droplets/mentor testing/requests/mentor-chats.test.ts testing/lib/mentor` (frontend): 588/588 passed.
- `npx jest tests/lib/mentor-chats.test.js tests/content-types/mentor-chat.test.js tests/no-entity-service.test.js` (backend, SQLite): 31/31 passed.
- `npx tsc --noEmit -p frontend`: clean. `npm run lint` (frontend): 0 errors, only existing `no-explicit-any` warnings. `npm run build` (backend): succeeds.
- Scratch repros, deleted afterwards: M2 (box `"joins"` → `"join"`) and m1 (focus on `BODY` after Cancel and after a failed delete).
- Confirmed in `@strapi/database` `where.mjs` that `$containsi` uses `escapeLike` with an ESCAPE clause.

By reading: M1 (PostHog init and identify; ALB logging not checked because the terraform read was denied), m3 (Postgres NUL behaviour; not run against Postgres), m4, m5 and the access-control paths.
