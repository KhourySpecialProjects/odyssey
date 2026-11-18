# Review: ODY-937 PR 4, recent Mentor chats card (`284d5c4d` on `4f5a6903`)

**Verdict: ship after fixes**

**Verified by running** (at `284d5c4d`): Jest on `recent-mentor-chats`, `mentor-chats-page`, `droplets/mentor/mentor-chat-list` and `tests/app/activity-page.test.tsx`: 26/26 pass. `npm run lint`: 0 errors. `npx tsc --noEmit -p frontend`: clean.
**By reading only:** everything below. I didn't open the app in a browser.

## Major

**1. The card renders on the server on every Activity tab.** `app/(general)/activity/layout.tsx:32-36`
A Server Component passed as `children` to a client component is rendered on the server whatever the client then does. `HomeOnly` only hides output that was already made. So every server render of the layout runs `RecentMentorChats`, on every tab: hard loads, `router.refresh()` and Server Actions. Each run costs `getCurrentUser`, `requireRole` → `getCachedUser` and the `/owned` list. The rows also go into the RSC payload, where nothing shows them.
*Scenario:* a student opens `/activity/voyages` directly. Strapi still serves the chat list (one miss per user every 60 s), and the student's chat titles are sent to the browser unused.
It also ties the card to the layout's lifetime, and the layout doesn't re-render when moving between tabs on the client. Deletes are fine, because Server Actions that revalidate the tag re-render it. A chat saved through `/api/mentor` (a Route Handler) doesn't clear the router cache, though. With `staleTimes.static: 180`, a prefetched `/activity` could show an old list for up to 3 minutes. I found this by reading only.
*Fix:* move `<Suspense fallback={null}><RecentMentorChats /></Suspense>` into `activity/page.tsx`, inside a `flex h-full flex-col` wrapper so the feed still fills the height, and delete `home-only.tsx`.

## Minor

**2. The Faculty check uses different roles from the rest of Mentor.** `components/feed/recent-mentor-chats.tsx:21`
The card reads the roles stored in the session. `listMentorChats`, `/api/mentor` and the Mentor chats tab use `requireRole([])`: Strapi roles, any signed-in user. As a result:
- (a) Someone who becomes Faculty after signing in keeps seeing the card until their session refreshes.
- (b) A user with both User and Faculty roles, such as a TA, can chat and sees the "Mentor chats" tab (`feed-left-nav.tsx:25`), but never gets the card.

This is the only Faculty gate in Mentor. Either confirm (b) is intended and add a test for it, or drop the check and rely on an empty list.
Signed-out visitors are fine: the layout calls `notFound()`, and the card returns early without the call (tested). Admins see the card.

**3. The link name doesn't contain its visible text (WCAG 2.5.3).** `recent-mentor-chats.tsx:60-63`
The visible text is "Continue in lesson", but the accessible name is "Continue: <title>". A voice-control user who says "click Continue in lesson" gets no match. *Fix:* `` `Continue in lesson: ${chatTitle(c)}` ``.

**4. Nothing tests where the card appears.** No test covers `HomeOnly` or the layout. `tests/app/activity-page.test.tsx` tests `page.tsx`, which this commit doesn't touch, so it still passes but doesn't cover the card. The card's own tests do check behaviour: the 3-item cut, the links, signed-out and Faculty skipping the call, and the ok:false and throw paths. After fix 1, add one case to the activity page test showing the card is there.

**5. The page shifts when the card arrives.** It streams in after the greeting with a `null` fallback and pushes down a feed that may already be on screen. That's acceptable for a small, optional card; mention it in the PR.

## Nit

- `mentor-chat-list.tsx:18`: nothing imports `export { chatTitle, relativeTime }` any more. Remove it.
- `recent-mentor-chats.tsx:76`: use the existing `errorName(error)` helper. `(error as Error)?.name` logs `undefined` when the thrown value isn't an Error.

## Checked, no issue

- **Caching:** the list is cached per user (`revalidate: 60`, tag `mentorChats(userId)`, `userId` in the query), so it's never shared between users. Saves and deletes revalidate the tag (`chat-history.ts:101,149,165,174`). `cache` and `next` are not both passed.
- **Imports:** `lib/mentor/chat-row.ts` is not a client module and imports only a type from the `"use server"` module. There is no cycle and the bundle doesn't grow.
- **A11y:** a `section` labelled by its `h2`, a real `ul`/`li` list, and no `role="status"` (tested).
