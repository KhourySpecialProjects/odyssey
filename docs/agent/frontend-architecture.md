# Frontend Architecture

## Route Groups and URL Structure

The frontend uses Next.js 15 App Router with route groups that organize pages by domain:

```
app/
├── (general)/          Dashboard, explore, feed, admin, settings, friends
│   ├── admin/          Admin panel (System Admin only, gated in admin/layout.tsx)
│   ├── dashboard/      User's enrolled droplets, progress, due dates
│   ├── explore/        Browse/search all published droplets and playlists
│   ├── feed/           Announcements (friend, system, group, kudos, etc.)
│   ├── settings/       User preferences, privacy, time zone
│   └── friends/        Friend list, requests, blocked users
├── (droplets)/         Droplet viewing — /d/[slug]
│   └── d/[slug]/       Individual droplet with lessons, notes, highlights
├── (playlists)/        Playlist viewing — /p/[slug]
│   └── p/[slug]/       Curated droplet collections
├── (creation)/         Content creation — /new/
│   └── new/            Create droplet, playlist, or group
├── (editing)/          Draft editing — /draft/
│   └── draft/          Edit unpublished content
├── (groups)/           Group pages — /g/[slug]
│   └── g/[slug]/       Study groups with members, assigned content, due dates
└── api/
    ├── auth/[...nextauth]/   NextAuth route handler
    └── user-activity/        Activity tracking endpoint
```

Route groups (parenthesized names) share layouts without affecting the URL path. Each group can have its own `layout.tsx` with group-specific chrome (navigation, sidebars).

## Component Organization

```
components/
├── admin/        Admin panel: user management, content moderation, analytics
├── dashboard/    Dashboard tiles, progress bars, enrollment cards
├── droplets/     Droplet display: lesson viewer, completion tracking, rating
├── explore/      Search bar, filter sidebar, droplet/playlist grid
├── feed/         Announcement cards by type, feed layout
├── new/          Creation forms: droplet wizard, playlist builder, group setup
├── playlists/    Playlist cards, enrollment flow, droplet ordering
├── shared/       Cross-cutting: header, footer, sidebar, modals, toasts
└── ui/           38+ reusable primitives (buttons, inputs, cards, dialogs, etc.)
```

The `ui/` directory contains design system primitives. Many are Radix UI-based with Tailwind styling. New UI components go here; feature-specific components go in their domain directory.

## Key Libraries and Their Roles

**UI Layer:**

- **Radix UI** — Accessible, unstyled component primitives (dialogs, dropdowns, tabs, etc.)
- **Mantine** — Used selectively for specific components (not the primary UI library)
- **Tailwind v3.4** — All styling. Config in `tailwind.config.ts`. Use `cn()` for conditional classes.
- **Lucide React** — Icon library

**Rich Text / Content Editing:**

- **TipTap** — Rich text editor for lesson content (v1 `blocks` JSON format)
- **BlockNote** — Block editor for newer lesson content (`blocksV2` JSON format)
- Lessons store content in one of two formats. Check `lesson.blocksV2` first (BlockNote JSON), fall back to `lesson.blocks` (TipTap JSON). The `strapiJSONToTiptapJSON()` and `tiptapJSONToStrapiJSON()` converters in `lib/utils.ts` handle the TipTap format.

**State Management:**

- **Zustand** — Client-side state (stores in `frontend/stores/`)
- **nuqs** — URL search params as state (used in explore page for filters/sorting)
- **React `cache()`** — Per-request deduplication for server components (see `lib/requests/cached.ts`)

**Validation:**

- **Zod** — Schema validation for all form data. Schemas in `lib/validations/`. Every Server Action validates input with Zod before calling Strapi.

**Analytics:**

- **PostHog** — Event tracking and feature flags. Client initialized in providers.

**Fonts:**

- **Lato** — Primary font loaded via Google Fonts in the root layout.

## Auth Flow

Authentication uses NextAuth with two providers: Azure AD (Northeastern SSO) and GitHub OAuth.

1. User clicks sign in → redirected to Azure AD or GitHub
2. `signIn` callback (`lib/auth/options.ts`) checks the user's email exists in the `authorized-users` Strapi collection. If not found, sign-in is rejected.
3. `jwt` callback fetches the user's roles from Strapi and their NUID from Microsoft Graph API (Azure AD users only). These are embedded in the JWT, along with the Strapi user id (ODY-555). Later `jwt` calls re-check that id every 5 minutes (data-cached lookup by email) and drop it if the account no longer exists.
4. `session` callback populates the NextAuth session object with roles, user ID, NUID, and profile data from the JWT.
5. Middleware (`frontend/middleware.ts`) only checks that a session token exists for `/admin`, `/d`, `/activity`. Role gating happens in `app/(general)/admin/layout.tsx` (SysAdmin via `getCurrentUser`) and in each Server Action via `requireRole`.

**Role hierarchy** (defined in `lib/globals.ts`):

- `System Admin` — Full platform access, user management, content moderation
- `Content Creator` — Can create and publish droplets
- `Content Editor` — Can edit existing published content
- `Faculty` — Can view analytics, manage groups, assign due dates
- `User` — Default role, can browse and enroll in content

Admin check: `isAuthorizedUserAdmin(roles)` returns true only for `System Admin`. Checked via `AuthorizedUserAdminRoles` array in `lib/globals.ts`.

## Server Components vs. Client Components

Next.js 15 defaults to Server Components. Follow these rules:

**Server Components** (default — no directive needed):

- Data fetching with `fetchAPI()`
- Pages and layouts that render Strapi data
- Any component that doesn't need browser APIs, event handlers, or React hooks

**Client Components** (add `"use client"` at file top):

- Interactive UI: forms, buttons with click handlers, dropdowns
- Components using `useState`, `useEffect`, `useRef`, Zustand stores
- Components using browser APIs (`window`, `document`, `localStorage`)

**Common mistake:** Making a component `"use client"` just because a child needs interactivity. Instead, keep the parent as a Server Component and wrap only the interactive child in a Client Component. This preserves server-side data fetching in the parent.

## Server Actions

All mutations go through Server Actions in `lib/actions.ts` (which has `"use server"` at the top).

Pattern for every action:

1. Validate input with Zod
2. Call Strapi via raw `fetch()` (not `fetchAPI()` — actions use PUT/POST/DELETE which need response handling)
3. Call `flattenAttributes()` on the raw response (required because raw `fetch()` doesn't auto-flatten like `fetchAPI()` does)
4. Call `revalidateTag()` with the appropriate `CACHE_TAGS` constant to bust the cache
5. Return a result object or redirect

**Critical:** Server Actions that use raw `fetch()` MUST call `flattenAttributes()` manually. `fetchAPI()` auto-flattens, but raw `fetch()` does not. This is a frequent source of bugs.

## Review comments

A reviewer of a droplet in review (System Admin or Content Editor, never an author: `isReviewerFor` in `lib/review-roles.ts`) comments on its lessons and Overview (ODY-806). The look and behaviour follow UI example 1's iteration 8 in the redesign prototype (`ui-redesign/comments.js` and `comments.css`). Plan and decisions: `docs/plans/ODY-806.md` (Round 2 for the prototype match).

- **Modes.** `components/draft/review/review-mode-bar.tsx`: Comment (the default), Read (no comments shown) and Edit (takes the lesson's lock, ODY-810; on the Overview it shows the editors).
- **Data.** `useReviewComments` (`hooks/use-review-comments.ts`) reads the reviewer's own review with `getMyReview` and adds, edits, deletes and resolves comments optimistically, rolling back on failure. The first comment opens the review; looking never does. The draft layout loads it once (`review-comments-context.tsx`) so the sidebar's counts and the page share it.
- **Anchors** come from `lib/anchors` (ODY-801) and are checked by `reviewAnchorSchema` (`lib/validations/review.ts`). There are five kinds:

  - **A whole BlockNote block:** `blockId` only.
  - **A whole Overview section:** its `field` only (`nextSteps`, `funFact`, …), never `blocks`.
  - **A quote with context:** `quote`, `prefix` and `suffix`, plus offsets.
  - **A spot between letters:** a quote of the letters beside it, plus `point: "before" | "after"`.
  - **A selection across blocks:** `blockId` and `start` in the first block, `endBlockId` and `end` in the last.

  `lib/review-comments.ts` has the pure rules: counts, numbering, marks, snippets.

- **Colour.** Teal (the `--rc-*` variables in `globals.css`) is for what the reviewer is doing. Amber only marks a comment:
  - **Pending:** a dashed line.
  - **Sent:** a tint over a solid line.
  - **Resolved:** a dotted grey line.
  - **A spot:** a caret beside its letters, drawn as an `anchor-caret` span.
  - **A whole block or section:** no mark of its own; the layer, or the section, outlines it.
- **Drawing, by kind of content:**
  - **BlockNote lessons:** ProseMirror decorations from `anchorsPlugin`, added through `createBlockNoteExtension` (BlockNote drops TipTap extensions made with our copy of `@tiptap/core`). A spot is a widget decoration. Never edit the editor's DOM by hand.
    - **Blocks with no saved text** (images, code, check-ins, formulas) take whole-block comments only: the text they show isn't saved as their text (`hasSavedText` in `lib/anchors/dom.ts`), and in a selection across blocks they count as "". Odyssey draws these blocks with React, which puts their `.bn-block-content` inside a `.react-renderer`, so find a block's content with `blockContentOf`, never `:scope > .bn-block-content`.
  - **Classic lessons and the Overview:** `ReviewTextView` writes read-only HTML outside React and draws marks with `drawAnchor`. Classic blocks have no lasting ids, so their comments are quotes within the whole lesson, and there are no whole-block comments.
- **Making and opening comments.** `comment-layer.tsx` wraps the content:
  - **The caret:** the pointer stays an arrow and a drawn caret follows it between letters. `lib/review-caret.ts` finds the stops, and `hooks/use-comment-caret.ts` moves the caret.
  - **Making a comment:**
    - a click comments at a spot;
    - a drag on the words (across BlockNote blocks too);
    - Alt-click or a block's bar on the whole block;
    - a selection made another way shows a Comment button.
  - **Showing them:** numbered margin tags with two-way hover lighting, the composer (`comment-composer.tsx`) and the card (`comment-card.tsx`: Edit, Delete, Resolve).
  - **Shared code:** selection timing, popover placement and dismissal come from `lib/selection`, shared with learner highlights.
- **The Overview.** `overview-review.tsx` hangs comments on `FrozenOverview` through two hooks:
  - **`renderField`:** the text of the title (`name`), description, overview and learning objectives, each its own `ReviewTextView` and `CommentLayer`.
  - **`renderSection`:** every section's heading (`section-comments.tsx`). Hovering it outlines the section, a click comments on the whole section, and its tags sit on the heading's line. The text below stacks its tags under them through `TagFloorContext` (`comment-tag.tsx`, which also holds the tag and outline both share).
- **Keyboard.** "Comment with the keyboard" (`comment-keyboard.tsx`) reaches every place the pointer does, across all the comment layers on a page (the Overview has one per field, and each section heading is a stop):

  - ↑ ↓ move by block, and → enters a block;
  - ← → move by letter, and Alt+← → by word;
  - Shift+↑ ↓ take several blocks, and Enter comments.

  A live region says where the caret is. Block bars are pointer-only.

### Reviewer Transcript panel (ODY-805)

The same reviewer sees the panel on every page of the draft (`review/review-panel.tsx`, wired by `review-transcript.tsx`). Plan: `docs/plans/ODY-805.md`.

- **Gate (D1).** `draft/d/[slug]/layout.tsx` calls `getReviewPanel` only when the draft is in review and the caller is a reviewer who isn't an author (the shell's `reviewing`). `DraftLayoutShell` renders the panel in `ReviewPanelDock`, so it survives lesson navigation.
- **Data (D2).** `getReviewPanel` (`lib/requests/reviews.ts`) reads the caller's own review by key: active criteria, scores with `aiFindings`, the latest `ai-scoring-run`, and `positions` (`c<commentId>` / `f<findingId>`, computed by `lib/review-panel/positions.ts`). It is never cached, and returns no comments: they come from the shared `useSharedReviewComments`. While a run is queued or running the panel calls `router.refresh()` every 4 s.
- **One review (D3).** `useReviewComments` returns `ensureReview()`, which opens the review once and shares the in-flight call. Comment adds and score writes both use it. Viewing creates nothing.
- **Scores (D4).** `useReviewScores` keeps server rows plus optimistic changes for Confirm (`acceptAiScores`), Undo (`unconfirmScores`) and Change (`saveReviewScore`), rolling back with a toast. A score counts as confirmed when `value` is set. "Not an issue" is kept per browser in `localStorage` (`useDismissedFindings`), and the summary note too (`useSummaryNote`).
- **Width (D6).** The shell owns the sidebar and panel state. Below 1440 only one is open (the other becomes the 48 px rail or collapses); below 1280 the panel is an overlay drawer that starts as the rail. `<main>` has `group` and `data-review-panel="open|rail"`, and lesson and Overview padding uses `group-data-[review-panel=open]:`. `tagSpace` (`comment-tag.tsx`) measures the content column, so margin tags stay clear of the panel. At 1280 and up the open panel is resizable from 384 px to `min(720, viewport − sidebar − 640)` through `usePanelWidth` (localStorage key `review-panel-width`) and the `--panel-w` CSS variable on the aside and `<main>`; the drawer stays 384 px and the width never goes below 384. The dock's `resize` prop is optional: without it the dock is a fixed 384 px.
- **Actions (D7).** Publish droplet and Send feedback live in the panel footer (`ContentActionButton`, with `disabledReason`, `initialNote` and the type-the-name step on `publishWithReview`). The footer renders even when the panel data failed to load. The sidebar then shows only Preview (`hideReviewActions`).
- **Pure rules** are in `lib/review-panel/` (`model`, `positions`, `criteria-icons`, `colors`); they import `lib/anchors/resolve` and `content` only.
- **Finding marks (ODY-849).** `CriterionDetail` registers its band and numbered findings in `ReviewFocusProvider.openDetail` (null while the panel is a rail); lessons and the Overview draw them in Comment mode with `findingMarks` (`finding-<id>` ids, so the comment layer ignores them) and dim comment tags via `.rc-tag`.
- **Badge marker.** A finding's number is an empty `.anchor-badge` marker (`DrawnAnchor.badge`, a widget in BlockNote, a span in `drawAnchor`) with no text node, so it can't shift offsets; CSS draws the digit from `data-badge`. It shares the mark's `data-anchor-id`, so exclude it with `:not(.anchor-badge)` when picking a mark's text span (scroll, flash, ring). The last detail opened drives the marks; closing it clears them even if another detail is still open.
- **Show in lesson (ODY-849).** The panel calls `ReviewFocusProvider.show(target, url)` (or `select`, ring only); the page that owns the target runs `useShowInLesson`: switch to Comment (Edit stops editing first), scroll the mark to the centre, flash it (`review-mark--flash`), keep the ring (`review-mark--focus`) and `report` the outcome. The provider's `sr-only` live region announces it. A whole-section comment scrolls to `[data-review-section]`. No flash or smooth scroll under reduced motion.
- **Add as comment (ODY-849).** An inline `CommentComposer` (`inline`, `initialBody` = the AI's reason) opens in the finding item and calls `select`, so nothing navigates. It posts through the shared context's `add` (which opens the review) and is hidden once the review is sent.

### The creator's view of sent feedback (ODY-807)

After Send feedback, a droplet's authors see the sent comments beside the text they edit. Plan and decisions: `docs/plans/ODY-807.md`.

- **Data.** `useSentFeedback` (`hooks/use-sent-feedback.ts`) reads `getReviewForDroplet`, which already shows an author nothing of an open review and nothing from AI, so the UI doesn't check again. Only a `sent` review shows. The draft layout loads it once for an author (`SentFeedbackProvider` in `review-comments-context.tsx`), for the sidebar's counts and the page.
- **Answering feedback.** Creators answer a reviewer's comment by replying; there is no Mark addressed (removed in ODY-897). The comment stays open, and only the reviewer resolves it. `addressedAt` stays in the backend schema, unused.
- **Lessons.** The marks are drawn in the BlockNote editor the creator is typing in:
  - **Following the text:** `anchorsPlugin` maps its decorations through each edit, so typing before a mark keeps it on its words.
  - **Finding comments again:** the editor reports its live content once a frame (`onContent`), and the lesson finds the comments again in that, never in the last saved copy. A sentence edited away goes to Outdated before the save.
  - **Old offsets:** offsets found in older text are ignored (`anchorsFoundIn`).
  - **Tags and cards:** `FeedbackLayer` (`feedback-layer.tsx`) adds the tags and the card. A click on a mark opens its card without taking focus, and the click still places the caret.
  - **Lighting:** the lit mark is lit by a style rule, never by redrawing the decorations. A redraw is an editor transaction, and one landing between a press and the editor reading the click puts the caret back where it was.
  - **Classic lessons (ODY-880):** the block editors can't draw marks, so the strip offers Feedback / Edit (`FeedbackViewToggle`, shared with the Overview). Feedback is `ClassicReviewView` inside `FeedbackLayer`, with the marks, tags and card; Edit is the block editors. Only Feedback shows while the lesson can't be edited (back in review, or locked by someone else). Outdated comments are found in the lesson's current `blocks`, so they stay listed in both views.
- **Outdated cards (ODY-881):** each item in `OutdatedComments` is a button that opens the normal `CommentCard`, anchored to the item, with the side's handlers in one `card` prop. Reviewers get Reply only on carried copies; creators and the shared Read view get Reply.
- **Refresh and unread (ODY-881):**
  - **Refresh:** `ThreadRefresh` in the draft layout runs `useThreadRefresh`. It runs only once the layout's sent feedback has a review (replies sit on sent roots). It calls `getThreadStamp` on mount, every 30 s while the tab is visible, and on focus, and reloads both feedback hooks only when the stamp changes. No check starts within 5 s of a successful one, and three failures in a row pause it until the next focus. A card also runs one check when it opens (`useThreadSeen().check`).
  - **Own-fallback hooks:** a page that falls back to its own `useDropletReviewComments` / `useDropletSentFeedback` instance (the droplet went into review after the page loaded) isn't refreshed by the poll or the card-open check, and has no seen state, so nothing shows as new there.
  - **Unread:** `useSeenReplies` keeps seen reply ids in `localStorage` (`review-seen-replies-<droplet id>`, newest 2000). A reply counts as unseen when it isn't the viewer's own, isn't a temp row and its comment isn't resolved (`unseenReplies` in `lib/review-threads.ts`).
  - **Where it shows:** a dot and "new replies" in the tag's label (`CommentTag unseen`), "N new replies" in both strips, and a "New" pill on replies that were unseen when the card opened. The card then marks them seen.
- **The Overview.** `overview-feedback.tsx` offers Feedback and Edit:
  - **Feedback:** `FrozenOverview` with `ReviewTextView` marks, and `SectionComments` with `readOnly`.
  - **Edit:** the editors. Switching back runs `settleDropletUpdates()` and then `router.refresh()`.
  - **The strip:** shows the summary note, and how many comments are on lessons.
- **Carried comments.** Submit copies each unresolved comment into the next round with `carriedFrom` pointing at the comment as first written. The reviewer's card reads "Pending · carried from round 1" with the original's date, and the strip and tags count the carried comments (`carriedRound`, `carriedNotes` and `carriedMeta` in `lib/review-comments.ts`).
- **Not here:** a read-only Transcript panel for authors (confirmed scores, the summary note and a comment list that jumps to each comment's text). ODY-805's panel is reviewer-only; `DraftLayoutShell` mounts no panel for an author.

## Final Overview Scan (ODY-787)

23 rule-based checks (49 rules) of a draft droplet, run on demand and saved, with no AI. The checks, the safe fetcher and how a scan runs are in `data-fetching.md` ("Fetching user-supplied URLs"); who may run one is in `server-action-auth.md` ("Overview scan").

- **Route.** `/draft/d/[slug]/scan` (`app/(editing)/draft/d/[slug]/scan/page.tsx`) renders inside the draft layout, so the layout's gate applies: anyone who isn't an author, a System Admin or a Content Editor gets the 404. It sits beside `[lessonSlug]`, so the lesson lifecycle reserves the slugs `scan`, `recap` and `present` (#1209): a lesson named "Scan" gets `scan-lesson`.
- **Data.** The page reads `getLatestOverviewScan` (cached under `CACHE_TAGS.overviewScan(id)`, which `runOverviewScan` revalidates) and a fresh read of the droplet's and lessons' `updatedAt`. `CHECKS` stays on the server; `buildScanView` (`lib/overview-scan/view.ts`) turns checks, the saved scan and the lessons into the `ScanView` the client page draws.
- **View model.** Rows are a check's status, its rules and their flags. A lesson flag links to `/draft/d/<slug>/<lessonSlug>` ("Go to lesson", labelled `Lesson N · <name>`); a droplet-page flag links to `/draft/d/<slug>#scan-<section>` (`scanSectionId`, the ids on the draft droplet page). A flag on a deleted lesson has no link. `checksChanged` is set when the saved `rulesVersion` differs or a check or rule is missing; `editedSince` when the droplet's or any lesson's `updatedAt` is after `ranAt`, or a flagged lesson is gone.
- **Components** (`components/draft/overview-scan/`). `overview-scan-page.tsx` holds the header (Last scanned, the pills, Run checks / Run again with `aria-disabled` while running, the two notes, a `role="alert"` for errors and an `sr-only` `role="status"` that reads "Checks finished: …"), the three columns and the footer ("Rules version … · 49 rules"). `check-row.tsx` is one accordion row, named "<Title>, <status word>, N flags"; `status-circle.tsx` draws the circle beside the word (`STATUS_WORDS`); `focus.ts` is the shared focus ring.
- **Entry points.** The sidebar's "Final Overview Scan" link shows when `canScan(roles, isAuthor)` (`lib/overview-scan/access.ts`, the same rule the action uses) and hides with `hideReviewActions`. While a reviewer has the Transcript open, `review/scan-link.tsx` in the panel replaces it.
- **Tests.** `testing/lib/overview-scan/seeded-droplets.test.ts` runs the real snapshot, all 23 checks and the safe fetcher (faked network) on the seeded droplets in `testing/mocks/overview-scan-droplets.ts`: one that passes everything, one with a problem per check, and one whose relative image can't be checked. ODY-796 ran the same droplets end to end in a browser against a local stack.
- **Known limits.** `editedSince` also shows after someone only opens a lesson (lock heartbeats bump `updatedAt`) and misses an unflagged lesson being deleted (ODY-878). Lesson flags open the lesson but don't scroll to the block (ODY-879).

## Mentor route (ODY-886)

`POST /api/mentor` (`app/api/mentor/route.ts`) is the one route behind every Mentor answer: the lesson sidebar (ODY-887) and quiz hints (ODY-888). It streams server-sent events. The request, the events and the error codes are in `lib/mentor/events.ts`, which is client-safe and holds `readMentorEvents`, the browser's reader. `testing/mocks/mentorEventsMock.ts` fakes responses for UI tests.

- **The checks, in order:**

  1. sign-in (`requireRole([])`, 401);
  2. the body (64 KB cap, then `mentorRequestSchema`; 413 or 400);
  3. the droplet and lesson by numeric ids (`getMentorSource`, `lib/mentor/source.ts`), then `lessonAccess` (`lib/lesson-access.ts`, the rule the lesson page uses too; 404 or 403);
  4. the ask (`resolveMentorAsk`, 400);
  5. ODY-884's allowance (`checkMentorAllowance`; 429 or 503 with its message and `Retry-After`).

  None of them calls Claude. Mentor answers only on published droplets that aren't hidden.

- **Ids only.** The browser sends ids and the student's words. The lesson is read from Strapi, cached with the lesson page's tags, and `buildMentorRequest` (ODY-885) never holds a quiz answer.
- **Streaming** (`lib/mentor/answer.ts`, `lib/mentor/sse.ts`). The response is returned once Claude connects; before that every failure is a JSON status (502 if Claude can't be reached). After it, every stream ends with one `done` (with citations) or `error` event, except one the student stopped, which aborts the Claude call. Answers time out at 90 seconds.
  - `Cache-Control: no-transform` is required: without it `next start` gzips the stream and holds it back until the end.
  - A `: ping` every 15 seconds keeps the load balancer from closing a long think.
- **Usage.** `after()` records one row with ODY-884's `recordMentorUsage` once the answer ends. An answer cut short counts at least the characters that streamed (about 4 to a token).
- **Tests.** `testing/app/api/mentor.test.ts` and `testing/lib/mentor/answer.test.ts` run the real Anthropic SDK against a scripted stream (`testing/mocks/claudeStreamMock.ts`).
- `GET /api/mentor/stream-check` (System Admins only) is a canned stream for checking streaming on dev with `?gap=70`. It is deleted once that check is done.

## Static Assets and Media

- Static assets (logos, icons, default images) live in `frontend/public/`
- User-uploaded media (profile photos, lesson images) stored in AWS S3
- S3 upload handled by `uploadImage()` Server Action in `lib/actions.ts`
- CDN URL configured via `AWS_CDN_URL` env variable
- Image paths in Strapi responses use the CDN URL prefix
