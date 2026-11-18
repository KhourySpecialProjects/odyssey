# Review: ODY-937 PR 2, Mentor panel chat list (`fec21cd8`)

**Verdict: ship after fixes.** The design matches what the owner decided. Ownership checks hold: every action reads the user from the session, so another user's chats can't appear. The token in `loadChat` covers two quick clicks, and `onlyIfEmpty` covers the default load racing the first question. Three Majors should be fixed before merge. Each is a small change.

## Blocker

None.

## Major

**M1. A chat load already in flight still overwrites a conversation started after it.** `frontend/hooks/use-mentor-chat.ts:253` (`ask`) and `:324` (`loadChat`)
`clear()` bumps `loadToken`, but `ask()` doesn't. `loadChat` also doesn't check `busy.current`. Rows are disabled only while a stream is running, not while a chat is loading.
Scenario: the student clicks a row while `getMentorChat` is slow. The view stays on the list until the load returns, so they press Back to chat and send a question. On desktop the sheet isn't modal, so they could instead click Explain in the lesson, which calls `ask` through the panel's explain effect. Either way the load then resolves, aborts the new stream and replaces the conversation. The question disappears from the panel, but the server still answers it into another chat (the old one, or a new one). The next answer goes to the loaded chat. The answer and the saved history stop agreeing.
Fix: add `loadToken.current += 1` at the top of `ask` (and `retry`), the same as `clear` does. Optionally add `if (busy.current) return false` after the await in `loadChat`.

**M2. `Loading chats…` uses `role="status"`, which the lesson footer counts as an answered quiz.** `frontend/components/droplets/lessons/mentor/mentor-chat-list.tsx:62`
`components/droplets/footer.tsx:152` counts `document.querySelectorAll('[role="status"]')`. The count must equal the number of `[role="question"]` elements, and each match must contain "right". The sheet already warns about this at `mentor-sheet.tsx:228`, and so does `mentor-hint.tsx:10`.
Scenario: a lesson with one quiz question, answered right. The student opens Chats, and while the list loads there are 2 status nodes for 1 question, so `setCanProceed(false)` disables Next. It can only block progress, never unlock it, but it breaks a rule the codebase states twice.
Fix: use `<p aria-live="polite">` (or `aria-busy` on the section), not `role="status"`.

**M3. The list often misses a chat that was just created or answered.** `mentor-panel.tsx:110`, `lib/mentor/chat-history.ts` (`startMentorChat`), `app/api/mentor/route.ts:176`
`listMentorChats` reads the Data Cache (`revalidate: 60`, tag `mentorChats(userId)`). Calling it from the client as a server action does not skip that cache. Only `revalidateTag` refreshes it. Save and delete both call `revalidateTag` (`chat-history.ts:145`, `:161`), but:
- `startMentorChat` doesn't. While a new chat's first answer is streaming (often 10 s or more), Chats shows the cached list without it, so no row is highlighted.
- The save runs in `after()`, after `await answer.usage` and `recordMentorUsage`. The client reloads the list when `streaming` goes false, which is when the stream closes. That reload almost always beats `saveMentorExchange` and gets the old cached list. The comment "A chat that just got its first answer joins the list" doesn't reliably hold. The next time the student presses Chats it is usually fixed.
Fix: call `revalidateTag(CACHE_TAGS.mentorChats(userId))` in `startMentorChat`. On the client, when `openChatId` isn't in a `ready` list, add an optimistic row (title = first question, `lastMessageAt` = now, current lesson and droplet) rather than relying on the timing of the stream-end reload. Delete is fine: it filters the row out locally, and server actions run one at a time, so a list request already in flight resolves before the delete does.

## Minor

**m1. "Read <current lesson>" appears on every answer, including chats from another lesson.** `mentor-sheet.tsx:292` → `mentor-message.tsx:81`
A chat started in lesson A and opened in lesson B shows "✓ Read B" on answers that were grounded in A. The citations are dropped correctly, but the label is now wrong. The same happens after switching lessons with the panel open: `MentorPanel` isn't keyed by lesson, so the chat carries over and the label follows the current lesson. Fix: in `savedMessages`, set a flag on answers from another lesson and hide the line, or show "Read <saved lesson>".

**m2. Citations go stale after switching lessons.** `use-mentor-chat.ts` `savedMessages`: `keepCitations` is decided once, at load time. Load a chat from lesson A while in A (citations kept), then go to B. Show source now searches B and toasts "Couldn't find that passage". Fix: store the lesson id on each answer and compare it at render time.

**m3. Toasts can't be heard on phones.** `mentor-panel.tsx:135-150`: the toasts "Couldn't open that chat" and "Couldn't delete that chat" render outside the modal sheet. The file says so already (the note above `toast.success`) and uses `feedback.announce` for that reason. Fix: on `!wide`, also call `setAnnouncement`.

**m4. Focus after delete probably ends up on `<body>`.** `mentor-sheet.tsx:257` schedules `focusSoon(heading)` before `confirm`'s `finally` closes the AlertDialog. Radix then restores focus to the trash button in its own later timeout, and that button has just been removed. Fix: pass `onCloseAutoFocus={(e) => { e.preventDefault(); heading.focus(); }}` to `AlertDialogContent` (through a prop). I checked this by reading only. The tests don't assert focus after delete.

**m5. The empty state isn't announced.** "No saved chats yet" and the loaded list aren't in a live region, so after "Loading chats…" a screen reader hears nothing. A count in the sheet's existing `aria-live` span would fix it.

## Nit

- `openChat` and `removeChat` depend on `[chat]`, a new object every render, so the memo does nothing. Destructure `loadChat`, `clear` and `openChatId` instead.
- `mentor-sheet.tsx` is now 376 lines. The toolbar and the composer are separate pieces and could go into `mentor-composer.tsx` / `mentor-toolbar.tsx`. Most of the 254 touched lines are re-indentation.

## Checked and fine (by reading)

Hook dependency arrays have no loops: the default-load effect is guarded by `defaulted`, and the stream-end effect is guarded by `wasStreaming`. New chat, row open, and deleting the open chat are disabled while streaming. A pending Explain skips the default load. Classes are Tailwind v3 only, with no `@theme`. No cache tag string is hard-coded (`CACHE_TAGS.mentorChats`). No new server action was added. The AlertDialog is a React child of the sheet content, so on the non-modal desktop sheet Radix's React-tree check stops it from closing the sheet. At phone width the list uses the existing scroller and rows truncate. I didn't render it in a browser.

## Tests

The new tests drive the real `MentorPanel`, `MentorSheet` and hook, with only the server actions, sonner, markdown and media query mocked. That's the right level. They cover the default open, the empty state, order, highlight, open without foreign citations, New chat, cancelling and confirming a delete, deleting the open chat, and list errors. Missing: M1 (a load in flight, then an ask), the onlyIfEmpty race at panel level, focus after delete, and the phone (`useMediaQuery → false`) layout. No timers are faked and there were no act warnings.

## Verified by running

- `cd frontend && npm ci`: OK.
- `npx jest` on the 3 touched test files: 3 suites, 48 tests passed. I ran it 3 times with no flakes, and found no `act(` or `console.error` output.
- `npx tsc --noEmit -p frontend`: exit 0.
- `npm run lint` (frontend): no errors. Warnings only, in files this commit doesn't touch.
- Everything else, including all of M1–M3, I checked by reading the code: `footer.tsx:152`, `app/api/mentor/route.ts:155-200`, `lib/mentor/chat-history.ts`, `lib/requests/mentor-chats.ts`.
