# Backend Architecture (Strapi 5)

- Strapi 5.56. Data access is the Document Service; the Entity Service is gone (guard: `backend/tests/no-entity-service.test.js`).
- Responses are flat natively. The frontend sends `Strapi-Response-Format: v4` to keep the nested shape (see `data-fetching.md`).
- Custom routes use `createCoreRouter` / `createCoreController` patterns.

## Content Type Directory Structure

Each content type in `backend/src/api/` follows this layout:

```
api/{content-type}/
├── content-types/{content-type}/schema.json   ← Source of truth for fields and relations
├── controllers/{content-type}.ts              ← Custom controller logic (optional)
├── routes/{content-type}.ts                   ← Route config (optional)
└── services/{content-type}.ts                 ← Custom service logic (optional)
```

The `schema.json` is the authoritative definition of every field, relation, enum, and constraint. Always read it before modifying a content type.

## All Content Types

```
api/
├── access-request/       User requests for platform access
├── ai-scoring-run/       One AI scoring attempt for a review (tokens, runState)
├── announcement/         Feed items (friend, system, group, kudos, droplet, playlist, review_feedback, review_published)
├── authorized-user/      User profiles (email-based, linked to roles)
├── authorized-user-role/ Role definitions (System Admin, Content Creator, etc.)
├── creation-request/     Requests to become a Content Creator
├── droplet/              Core learning units — the main content entity
├── droplet-lesson/       Join table: Droplet ↔ Lesson with ordering (orderIndex)
├── due-date/             Assignment deadlines for groups
├── enrollment/           User ↔ Droplet progress tracking
├── friendship/           Friend connections between users
├── gallery/              Image galleries
├── group/                Study groups with membership and assigned content
├── highlight/            Text selections within lessons (colored annotations)
├── lesson/               Individual lesson pages within droplets
├── note/                 User notes on lessons (positioned vertically)
├── playlist/             Curated droplet collections
├── report/               Bug reports
├── review/               One reviewer's review of a droplet round
├── review-comment/       Anchored review comments (replies via parent, carriedFrom, addressedAt)
├── review-criterion/     Rubric criteria (admin-edited, seeded)
├── review-score/         1-5 score per lesson (or overall) and criterion
└── tag/                  Content categorization tags
```

## Domain Model — Core Relationships

### Droplet (the central entity)

A Droplet is a bite-sized learning unit — the atomic content piece of Odyssey.

```
Droplet
├── name: string (required, unique)
├── slug: uid (auto-generated from name)
├── type: enum [knowledge, skill]
├── focusArea: enum [personal, professional, technical]
├── status: enum [draft, edit, published] (default: draft)
├── description: text (max 500 chars)
├── overview: HTML (CKEditor, @_sh/strapi-plugin-ckeditor)
├── isHidden: boolean (default: false)
├── averageRating: decimal (0-5, default: 0)
├── funFact: text
├── originalDropletId: integer (links draft copies to published originals)
├── inReview: boolean
├── reviewRound: integer (server-owned submission count; +1 when inReview turns true)
├── afterReview: text
│
├── lessons → many-to-many Lesson (direct relation; order comes from Lesson.orderIndex)
├── tags → many-to-many Tag
├── prerequisites → many-to-many Droplet (self-referential)
├── postrequisites → many-to-many Droplet (inverse of prerequisites)
├── enrollments → one-to-many Enrollment
├── groups → many-to-many Group
├── authorized_users → many-to-many AuthorizedUser (authors)
├── usersFavorited → many-to-many AuthorizedUser (users who favorited)
├── reviewDroplet → many-to-many AuthorizedUser (assigned reviewers)
├── announcements → one-to-many Announcement
├── droplet_lessons → one-to-many DropletLesson (join table records)
└── learningObjectives → component[] (repeatable "droplets.learning-objective")
```

The 5 CKEditor fields (droplet `overview`; `content` on `droplets.generic`, `droplets.expandable`, `quizzes.question`, `quizzes.open-ended-question`) are HTML in `text` columns, custom field `plugin::ckeditor5.CKEditor`, presets `light`/`rich` in `backend/src/admin/app.tsx`.

### Lesson

A single page of content within a Droplet.

```
Lesson
├── name: string (required, max 100)
├── slug: uid (auto-generated from name)
├── type: enum [general, setup, activity, caseStudy] (default: general)
├── blocksVersion: enum [v1, v2] (default: v1)
├── blocks: dynamiczone (v1 TipTap — components: generic, video, quiz, callout, expandable, open-ended-quiz)
├── blocksV2: json (v2 BlockNote JSON — newer format)
├── orderIndex: integer (ordering within a droplet)
├── originalLessonId: integer (set on [EDIT]-draft lessons: id of the live lesson it was cloned from)
│
├── droplets → many-to-many Droplet
├── enrollments → many-to-many Enrollment (via viewedLessons)
├── droplet_lessons → one-to-many DropletLesson
├── notes → one-to-many Note
└── highlights → one-to-many Highlight
```

**Content format detection:** Check `blocksVersion` field. If `v2`, read `blocksV2` (BlockNote JSON). If `v1` or absent, read `blocks` (TipTap dynamic zone components).

### Enrollment

Tracks a user's progress through a Droplet.

```
Enrollment
├── isComplete: boolean (default: false)
├── rating: integer (1-5, nullable)
├── isFirstTime: boolean (default: true — false after first completion)
├── isArchived: boolean (default: false)
├── dueDate: datetime (nullable, set by group assignments)
├── completionDate: datetime (nullable, set when isComplete becomes true)
│
├── authorizedUser → many-to-one AuthorizedUser
├── droplet → many-to-one Droplet
├── viewedLessons → many-to-many Lesson
└── notes → one-to-many Note
```

### Group

Study groups with hierarchical membership.

```
Group
├── name, slug, description, semester, isArchived
├── creator → one AuthorizedUser
├── admins → many-to-many AuthorizedUser
├── managers → many-to-many AuthorizedUser
├── members → many-to-many AuthorizedUser
├── droplets → many-to-many Droplet
├── playlists → many-to-many Playlist
└── dueDates → one-to-many DueDate
```

### Other Key Types

- **Announcement** — Feed items. Types: droplet, playlist, friend, system, group, kudos, review_feedback, review_published. Relations to droplet, playlist, group, sender/receiver users.
- **Note** — User annotation on a lesson. Has `content` (text), `yPosition` (vertical placement), linked to enrollment and lesson.
- **Highlight** — A learner's highlight of one block's text: `color` (pink #f9a8d4, orange #fbd38d, yellow #fff300, green #86efac, blue #93c5fd), `text`, `position` (`{ start, end }` character offsets in the block's text) and `blockId`. A generic block's highlights use its id; other blocks' (callouts, expandables, code) use `blockNoteIdToNumber("<__component>:<id>")`, since Classic lessons' block ids are only unique within a type. A selection across blocks is saved as one highlight per block. `context` (`{ quote, prefix, suffix }`, ODY-198) lets the lesson viewer find a highlight again after the author edits the lesson (`frontend/lib/highlight-placement.ts`); one whose text was deleted is listed for the reader to move or remove, never dropped. Drawn by `HighlightLayer` (`components/droplets/lessons/highlight-layer.tsx`) and `lib/highlight-regions.ts`.
- **Friendship** — Bidirectional with status: pending, accepted, rejected, blocked.
- **Tag** — Simple `name` field, many-to-many with Droplet.

### Review (ODY-798)

Five types, all `draftAndPublish: false`. Relations to droplet, lesson, authorized-user and criterion are one-way manyToOne; `review` has two-way `comments`, `scores` and `aiScoringRuns`.

- **Review** — `round` is the droplet's submission number, shared by all reviewers. `key` = `<dropletId>:<reviewerId>:<round>` (unique index `reviews_key_uq`). `state`: open, sent, published; withdrawing keeps the open review. `round` is `droplet.reviewRound` when the review opens. Keys keep the draft's id after an `[EDIT]` publish moves the review to the live droplet (G15). Reviewer slot `0` in `key` means no reviewer: the ODY-808 backfill of `afterReview` (`sent`, round 1, no reviewer or `sentAt`). Submit never carries it.
- **ReviewComment** — `field` (blocks, description, overview, objective), JSON `anchor`, `body` (max 5000), optional `parent` for replies. No lesson means the droplet-level fields. The anchor is either text (quote, prefix and suffix, with offsets when known) or a whole block (`blockId` only); `reviewAnchorSchema` in `frontend/lib/validations/review.ts` checks both. No author of a droplet can open, read or write a review of it, whatever their role (ODY-810's `isReviewerFor`).
- **ReviewScore** — `value` and `aiValue` are 1-5 (nullable), `criterionName` is a snapshot. `aiFindings` (JSON, nullable, ODY-805) holds the AI's passages as `AiFinding[]` (`id`, `quote`, `reason`, `lessonId`, text-quote `anchor`; ids unique within a run, across all scores; `lessonId` non-null exactly when `anchor.field` is `blocks`; `aiFindingSchema` in `frontend/lib/validations/review.ts`). Only Score with AI (ODY-814) writes it, and authors never read it. After an `[EDIT]` publish its `lessonId` on Overall scores still names draft lessons, because `moveReviewsToLive` rewrites keys, not JSON; harmless, since the review is closed and AI fields are reviewer-only. `key` = `<reviewId>:<lessonId|overall>:<criterionId>` (unique index `review_scores_key_uq`). No lesson means Overall. When publish moves a review, score keys are rewritten to the live lesson id (`<reviewId>:<liveLessonId>:<criterionId>`); Overall keys are unchanged.
- **AiScoringRun** — `runState` (queued, running, done, partial, failed), not `status`: the content-manager extension wraps any model with a `status` attribute. Stores `inputTokens`/`outputTokens` only, no `costUsd`. `progress` (JSON, nullable, ODY-805) is `{ done: (lessonId | "overall")[], current: lessonId | "overall" | null }`; `failedLessons` may hold `"overall"` too. The panel reads the run with the highest `id`.
- **ReviewCriterion** — Router has no `delete` route; retire with `active: false`. `name` is unique (`review_criteria_name_uq`). `backend/src/lib/review-criteria-seed.ts` seeds five criteria on boot only when the table is empty.
- **`droplet.reviewRound`** — The droplet lifecycle owns the counter: `beforeCreate` sets 1 if `inReview` else 0, and `beforeUpdate` adds 1 when `inReview` goes from not-true to true. Client and admin edits to it are ignored (the admin field shows as editable but a save has no effect).
- **`droplet.inReview`** — Only the review routes change it (see "Review workflow routes"). The core droplet `update` route has a middleware (`routes/droplet.ts`, `rejectInReview`) that returns 400 `inReview can only change through the review routes.` when `body.data` has an own `inReview` key (D10). Core `create` and the Strapi admin are not guarded (accepted gaps).
- Boot backfill (`backend/src/lib/review-round-backfill.ts`) sets in-review droplets with `reviewRound` null or below 1 to 1; it's idempotent. Adding the column leaves existing rows NULL (no column default), so code must treat NULL as 0.
- Deleting a lesson nulls the relation on its comments and scores, so they look like Overview/Overall. Read a score's lesson from `key`, and treat `field: "blocks"` with no lesson as orphaned.

## Strapi API Patterns

### Document Service API

```javascript
const uid = "api::droplet.droplet";
await strapi.documents(uid).findMany({
  filters: { status: "published" },
  populate: { lessons: true, tags: true },
  sort: { createdAt: "desc" },
  pagination: { page: 1, pageSize: 25 },
});
await strapi
  .documents(uid)
  .findOne({ documentId, populate: { lessons: true } });
await strapi.documents(uid).findFirst({ filters: { id } }); // by numeric id
await strapi
  .documents("api::enrollment.enrollment")
  .create({ data: { isComplete: false } });
await strapi
  .documents("api::enrollment.enrollment")
  .update({ documentId, data: { isComplete: true } });
await strapi.documents(uid).delete({ documentId });
```

- Single entries are addressed by `documentId`; the numeric `id` still works in `filters`.
- The Query Engine (`strapi.db.query`) is used only inside `strapi.db.transaction`.

### Response shape

- v5 returns flat `{ data: { id, documentId, ...fields } }` natively. The frontend sends `Strapi-Response-Format: v4`, so it receives `{ data: { id, documentId, attributes } }`.
- `fetchAPI()` flattens that. Raw `fetch()` calls `flattenAttributes()` manually (it keeps `documentId`).

### Strict REST input

- An unknown query or body key returns 400 "Invalid key"; `error.details.source` is `query` or `body`.
- Non-schema input keys need `strapi.contentAPI.addInputParams` (`backend/src/index.ts`).
- Guard: `frontend/testing/contract/strapi-query-catalog.test.ts`; smoke: `scripts/strapi-v5-cutover/api-smoke/smoke-queries.sh`.

### Draft & Publish

Strapi Draft & Publish is **off on every content type** (`draftAndPublish: false`), turned off in ODY-633 ahead of Strapi v5, where `status` is reserved on D&P types. Visibility is controlled only by Odyssey fields:

- Droplet: `status` (draft → edit → published) and `isHidden`
- Voyage: `status` and `isArchived`
- Playlist: `isPublic` and `isArchived`

Droplet `isHidden`/`status` and voyage `isArchived` only filter listings: `/d/[slug]` and its lesson pages stay reachable by URL (ODY-660). Voyage `status` (non-staff) and playlist `isPublic` (non-enrolled) do gate their slug pages. Lessons have no visibility field. Don't send `publicationState` or `publishedAt`. New content types must set `draftAndPublish: false`, since the admin's Content-Type Builder turns it on by default and turning it off later triggers the hard delete below.

- **`status` reservation:** v5 reserves `status` only on D&P types. With D&P off, boot only warns (only `id`/`document_id` collisions throw), but the Content-Type Builder refuses to create a _new_ `status` attribute. The admin handling is in the content-manager extension below.
- **Cutover-only:** turning D&P off on a type deletes every row with `published_at IS NULL` (v4 hard-deletes on boot before migrations; v5 does the same and keeps the column). Back-fill `published_at` first. See `scripts/strapi-v5-cutover/unpublished-rows/` and `docs/playbooks/strapi-prod-migration-day.md`.

Publishing an `[EDIT]` draft (`publishDraftToOriginal`) is one Strapi transaction behind `POST /api/droplets/:id/publish-edit` (see "Publish-edit route" below), so a failure changes nothing: the live droplet, lessons, enrollments and the draft are exactly as before. It syncs lessons in place instead of recreating them. Each draft lesson is matched to a live lesson by `originalLessonId` (recorded when `duplicateDroplet` clones the draft), then by exact name; position is never used. A matched lesson is updated with only the fields that changed, so it keeps its id and slug (even if renamed) and everything keyed to it: students' `viewedLessons`, notes and highlights. Draft lessons with no match are created, and live lessons missing from the draft are deleted. Writes run in this order: the droplet's metadata, lesson updates, creates, deletes, then all of the draft's enrollments move (no 25-row cap), then the draft's own lessons and the draft are deleted. The pure planner is `backend/src/lib/lesson-sync.ts`.

### Lifecycle hooks on Strapi v5

Hooks live in `src/api/*/content-types/*/lifecycles.ts` (droplet, lesson, playlist, creation-request, access-request). They are tested against a real v5 instance (ODY-599); facts checked in the Strapi 5.56.0 source and confirmed by those tests:

- **One call per operation.** With Draft & Publish off, the document service's `create`, `update` and `delete` each make one `db.query` call, so `beforeCreate`/`afterCreate`/`beforeUpdate`/`afterUpdate` fire once per operation. Nothing runs twice for a "draft" and a "published" version, so Slack sends happen once. `event.params.where.id` is still the numeric row id.
- **Required fields are validated before `beforeCreate`.** A create without `slug` fails with `slug must be defined`, even though the hook would generate one. Required checks used to be skipped because new rows were drafts, and D&P is now off. **Contract:** REST and document-service creates of droplets, lessons and playlists must send a slug (any value); `beforeCreate` replaces it with one generated from `name`. Every frontend create already does (`"random"` in `createDroplet`/`addLesson`, `tempSlug` in `createPlaylist`, `publish-<uuid>` in publish-edit, real slugs when duplicating). Tests assert the rejection.
- **A missing dynamic zone arrives as `[]`.** v5 fills `blocks: []` before `beforeCreate`, and the lesson create guard (`!data.blocks`) treats `[]` as present, so a lesson with no content can be created. That is relied on: the draft editor's "Add lesson" calls `addLesson` with `blocks: []` and no `blocksV2` to create a blank lesson, filled in later. Don't tighten the create guard without changing that caller. The update-path guard does check array length.
- **Unknown data keys survive** the document service and the admin, so `regenerateSlug` reaches `beforeUpdate` and the hook deletes it. REST rejects unknown keys earlier with `400 Invalid key`; `regenerateSlug` is allow-listed for **PUT only** via `addInputParams`, and a POST with it still gets a 400 (ODY-700).
- **Bulk `*Many` hooks** (`beforeCreateMany`, etc.) never fire from the Document Service. The v5 upgrade codemod comments lifecycle files out, so check the diff.
- **Document middlewares** (`strapi.documents.use`) are not used here; adding one needs a ticket.
- **The Entity Service is gone from `backend/src`** (ODY-606); `tests/no-entity-service.test.js` fails on any `entityService` usage. Inside hooks:
  - **Before hooks** only know the numeric row id, so use `strapi.documents(uid).findFirst({ filters: { id: event.params.where.id }, fields, populate })`. It is one query and needs no documentId.
  - **After hooks** have `result.documentId`, so use `strapi.documents(uid).findOne({ documentId: result.documentId, fields, populate })`.
  - Relations come back as arrays of populated entries, and `populate: { blocks: true }` loads the lesson dynamic zone.
- **`plugin::content-manager.uid` `generateUIDField` keeps its signature**, so `lib/lifecycle-utils.ts` `generateSlug` works unchanged.
- **Slack sends are a no-op unless `NODE_ENV=production`** (`lib/slack.ts`), so tests switch it on per test and count `fetch` calls to the webhook URL.

### Content-manager extension (ODY-699)

With D&P off, the v5 admin (content-manager) still treats `status` as its own computed D&P field, which breaks the real `status` enum on droplet and voyage. `src/extensions/content-manager/` wraps three things for any model with D&P off and a `status` attribute:

- **Edit view:** `document-metadata.formatDocumentWithMetadata` stops overwriting `status` with `undefined`; the stored value is kept (still permission-sanitized).
- **List view:** `document-metadata.getStatus` returns the stored `status` when the request's model (`strapi.requestContext`) is such a model.
- **Saves:** the `collection-types` controller (`create`/`update`/`clone`, patched in place so `autoClone` still works) swaps a value like `edit`, which the admin rejects with 400 "Invalid status", for `draft` before validation. The `document-manager` service puts the real value back after sanitization, so field permissions apply and the droplet lifecycle sees `edit` once.

It depends on content-manager internals. Services are lazy, so a bootstrap hook in `strapi-server.ts` resolves the wrapped services at startup; boot fails if a wrapped member disappears. If a saved status is not restored, the controller wrapper logs an `ODY-699` error instead of throwing. CI runs backend Jest (`test.yml` backend matrix, Node 20.14.0), so `tests/admin` catches drift on every PR. **After any `@strapi/*` bump,** also do one admin save of a droplet. Delete the extension if upstream fixes this. Ticket: [ODY-699](https://linear.app/aiil/issue/ODY-699).

### Lesson lock routes (`custom-lesson` controller)

`POST/DELETE /api/lessons/:id/lock`, `PUT /api/lessons/:id/lock/heartbeat` and `GET /api/lessons/:id/lock-status` (tested in `tests/api/lesson-lock.test.js`):

- **`:id` is a numeric id or a documentId** (`/^\d+$/` or `/^[A-Za-z0-9]+$/`; anything else is a 404), so the frontend can move to documentIds later. It still sends numeric ids. Request and response shapes, statuses and messages are unchanged.
- **Lookup, release and heartbeat** use the Document Service (`findFirst`, then `update({ documentId })`). `documents.update` runs the lesson `beforeUpdate` hook, which does nothing here because the data has no `blocks`/`blocksV2` or `regenerateSlug`.
- **`acquireLock` stays on the Query Engine** (`strapi.db.query`) inside `strapi.db.transaction`. A throw after its write rolls the write back (tested). The Query Engine is not deprecated.
- **Known race, not fixed (pre-existing):** on Postgres (READ COMMITTED) two concurrent acquires can both read "unlocked" and both write, because the transaction does not serialize them. A real fix needs a conditional update (compare-and-swap in one `UPDATE ... WHERE`) or a row lock (`SELECT ... FOR UPDATE`). Worth its own ticket.

### Review score routes (`custom-review-score` controller, ODY-803)

`POST /api/review-scores/upsert` (`{ reviewId, lessonId | null, criterionId, value, userId }`), `POST /api/review-scores/accept-ai` (`{ reviewId, lessonId | null, userId }`) and `POST /api/review-scores/unconfirm` (same body, ODY-805). Logic in `src/lib/review-scores.ts`, tested in `tests/api/review-score-upsert.test.js`. Called by `saveReviewScore` / `acceptAiScores` / `unconfirmScores` in `frontend/lib/requests/reviews.ts`.

- **POST, not PUT:** `PUT /review-scores/upsert` would match the core `PUT /review-scores/:id`.
- **One transaction each.** It locks the review row (`FOR UPDATE`), then refuses: not the reviewer (403), review not `open` (409), inactive criterion, a lesson outside the review's droplet, or a value outside 1–5 (400). Unknown body keys are a 400 (custom routes get no strict input check).
- **Upsert by `key`** (`<reviewId>:<lessonId|overall>:<criterionId>`). If a concurrent create wins the `review_scores_key_uq` index, the whole transaction runs once more and updates. It is rerun, not retried in place, because on Postgres a failed insert aborts its transaction. It checks whether the key now exists instead of matching error codes: SQLite reports the violation as `NotNullError` (errno 19), Postgres as `23505`.
- **Tests run on SQLite**, which has one connection and ignores `FOR UPDATE`, so the row lock itself is not tested. The race is simulated by making the first key lookup miss.
- **Reviewer saves never reach the rerun on Postgres:** the review lock serializes them. Only a writer that skips the lock can race them; Score with AI's `finish` (below) takes the same lock.
- **Separate writers:** these routes write only `value`. Score with AI (ODY-814) writes only `aiValue`/`aiRationale`. `accept-ai` copies `aiValue` into `value` where `value` is null and the criterion is active. Both it and `unconfirm` refuse a lesson outside the review's droplet (400), through one shared check.
- **`unconfirm`** is Undo for Confirm: in the scope it sets `value` to null where `value = aiValue`, so the reviewer's own changes stay. It takes the same lock and guards, and only clears rows on active criteria, like `accept-ai`.
- Responses are `{ data: { dropletId, score } }` / `{ data: { dropletId, scores } }`, not v4 entries. The action revalidates `CACHE_TAGS.review(dropletId)` from that answer.

Run the backend tests with `npm --prefix backend test` (see `testing-and-deployment.md`).

### Score with AI routes (`custom-ai-scoring-run` controller, ODY-814)

`POST /api/ai-scoring-runs/start`, `/heartbeat` and `/finish`. Logic in `src/lib/ai-scoring-runs.ts` (it reuses `lockReview`, `lockOpenReview`, `findScore` and `scoreKey` from `review-scores.ts`), tested in `tests/api/ai-scoring-run.test.js`. Called by `startAiScoring` (`frontend/lib/requests/ai-scoring.ts`) and the background run (`frontend/lib/ai-review/score-run.ts`). Strict bodies and `userId` from the Server Action, as for the score routes.

| Route       | Body                                                                                                                                              | 200 `data`                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `start`     | `{ reviewId, userId, model, promptVersion }`                                                                                                      | `{ dropletId, run, criteria }`             |
| `heartbeat` | `{ runId, userId, inputTokens, outputTokens }`                                                                                                    | `{ dropletId, run }`                       |
| `finish`    | `{ runId, userId, runState, failedLessons, inputTokens, outputTokens, error, scores: [{ lessonId \| null, criterionId, aiValue, aiRationale }] }` | `{ dropletId, run, saved, kept, dropped }` |

- **One run at a time.** `start` locks the review row (`lockOpenReview`: reviewer, `open`) and refuses with 409 unless the droplet is `inReview` (withdrawing leaves the review open). It marks every `queued`/`running` run whose `updatedAt` is more than 10 minutes old `failed` ("Stopped: no progress for 10 minutes."), then refuses with 409 if one is left. It snapshots the active criteria (in `order`) into the run's `criteria` and returns them, and creates the run `queued`. ODY-815's cost cap belongs under the same lock. 409 too when no criterion is active.
- **Heartbeat** sets `running` (and `startedAt` once) and saves the token totals so far, so a run cut short still records what it spent. The run calls it after every lesson, so `updatedAt` measures progress, not age: a long droplet isn't taken for dead. It is 409 on a run that has ended, so a run marked dead stops.
- **`finish` writes only `aiValue`/`aiRationale`**, by score key, in one transaction under the review lock. A score whose `value` the reviewer set is skipped (`kept`), so running again replaces unconfirmed suggestions only. A suggestion for a lesson that left the droplet mid-run, or a criterion deleted since the start, is skipped (`dropped`) and the rest are saved. A criterion outside the run's snapshot is a 400 and nothing is written.
- **A review sent mid-run** (`heartbeat` or `finish` finds it not `open`) ends the run `failed` ("The review was sent before scoring finished."), keeps its token counts and saves nothing; both answer 200 with that run.
- **Tests run on SQLite**, so two starts at once run one after the other; the test checks the outcome (one run), not the Postgres lock. They age a run with raw SQL on `ai_scoring_runs.updated_at`, because the Query Engine sets `updatedAt` itself.
- **Frontend:** `startAiScoring(dropletId)` (System Admin or Content Editor, not an author) needs `ANTHROPIC_API_KEY`, opens the review with `getOrOpenReview`, checks the `ai-scoring` rate limit, calls `start`, then answers at once and runs `runAiScoring` in `after()` (Sonnet 5.5, effort `high`, `PROMPT_VERSION`). `next/server` is imported inside `startAiScoring`, because jsdom tests that import the sidebar have no Fetch API globals.
- **The run** streams one request per lesson, then the Overall Score (given the lessons' scores), and saves everything with one `finish`. A refusal, `max_tokens`, an 8-minute timeout or any other error is that request's failure, and the run ends `partial`.
  - **Retries:** the SDK retries 429, 5xx and failed connections twice (`maxRetries`, honouring `retry-after`). The run itself retries only a stream that broke on an `overloaded_error`, `api_error` or `rate_limit_error` event, twice. `finish` is retried twice on a network error or a 5xx; a retry after a save that did commit gets 409 and stops.
  - **Tokens:** a request that failed mid-stream and was retried isn't counted.
  - **Caching:** each lesson request puts its cache marker on its last lesson block, not after the closing instruction (which differs every time), so the next lesson's request reads the shared prefix back. On a real run, check `cache_read_input_tokens` is above 0 from the second lesson on.
- **Known gaps:** the rate limit is taken before `start`, so a refused start (already running) still uses one. ODY-630's limiter bug applies.
- **Polling:** `getAiScoringRun` reads the latest run uncached, and shows a stale active run as failed. The sidebar's `ScoreWithAiButton` checks it every 5 seconds, one check at a time, stops when refused, and refreshes when the run ends.

### Publish-edit route (`custom-droplet` controller)

`POST /api/droplets/:id/publish-edit` (ODY-800; tests in `tests/api/publish-edit.test.js`). Logic lives in plain modules, not `services/` (Strapi auto-loads those): `src/lib/publish-edit.ts` and `src/lib/lesson-sync.ts`.

- **Request:** `:id` is the draft's numeric id or documentId (anything else is a 404). The body is `{ originalDropletId }` and nothing else: any other key is 400 `Invalid key <k>`, and the id must be a safe integer, > 0 and <= 2147483647. Custom routes skip strict REST, so the controller checks this itself.
- **Responses:**
  - `200 { data: { slug, originalDropletId, lessons: { updated, unchanged, created, deleted }, enrollmentsMoved } }`.
  - `404`: the draft is gone (`DRAFT_GONE_MESSAGE`, "This draft no longer exists. It may already have been published."), or the original is.
  - `409`: no `originalDropletId`, it differs from the body's, the draft is already `published`, `:id` is the original, or the draft is `inReview` (checked under the row lock; publish it through `publish-review`, or withdraw first).
  - `400`: guards (missing difficulty, an empty draft over a live droplet with lessons, a lesson that would be left empty) and a Strapi `ValidationError` during the writes, as `Publishing failed (<reason>, field: <path>). Nothing was changed.` (lesson errors read `lesson "X": <reason>`).
  - `500`: `Publishing failed. Nothing was changed. Try again.`
- **ODY-804 seam:** `preparePublishEdit` (locks, reads, guards, plans) then `applyPublishEdit` (writes; returns `lessonMap`, draft lesson id to live lesson id) then `deleteEditDraft`. `publishEdit` composes them in one `strapi.db.transaction()`, and each step throws unless `strapi.db.inTransaction()`. Never catch a DB error inside the transaction and carry on (see the learning `2026-10-26-strapi-v5-transactions.md`).
- **Row locks:** the first statements lock the draft row, then the original, with `queryBuilder(...).forUpdate()` (the only Query Engine use here). A second publish of the same draft waits, then finds the draft gone and gets 404. Only Postgres enforces this; SQLite ignores `forUpdate`.
- **Reviews move:** after `applyPublishEdit`, `moveReviewsToLive` (`src/lib/review-move.ts`) re-points every review of the draft at the live droplet, with its comments and scores moved to the matching live lessons. Review state is unchanged. Comments or scores on a lesson with no live match are left as they are. It runs in the same transaction, so a failure rolls the publish back.
- **Lesson create slug:** each create sends `publish-<uuid>`. Uid uniqueness is validated before `beforeCreate` swaps in the real slug, so a fixed placeholder would collide once any lesson stored it.
- **Strapi 5.56 source facts:** every Document Service call joins an outer `strapi.db.transaction()`; `entry.*` events and webhooks are deferred to the outermost commit and never sent on rollback; lifecycle hooks run inside the transaction (voyage-claim marking rolls back too); deleting the draft does not cascade to related entries (enrollments keep a null link); the Document Service `findMany` has no 25-row cap (that is REST only).
- **Frontend (`publishDraftToOriginal`):** `checkPublishDraft` (`lib/auth/review-freeze.ts`, ODY-810) reads the draft fresh and applies `isReviewerFor`: in review, a System Admin or Content Editor who isn't an author; otherwise a System Admin, or a Faculty author. It also refuses when the draft's `originalDropletId` differs from the argument. A second fresh read gets the draft's `documentId`, and the action refuses when it has none (no numeric fallback). Then one POST. It revalidates on 2xx, 5xx and network errors but not 4xx, and shows "could not be confirmed" for a network error or a gateway 5xx without a Strapi message, since the publish may have committed.

### Review workflow routes (`custom-droplet` controller)

ODY-804. Logic is in `src/lib/review-workflow.ts` (plus `review-move.ts` and `publish-edit.ts`); the controller only parses and maps errors. All are `POST /api/droplets/:id/<action>`, with `:id` as above and strict bodies (a non-object body → 400 `Body must be an object`, an unknown key → 400 `Invalid key <k>`).

| Route             | Body                                                 | 200 `data`                                                                                            |
| ----------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `submit-review`   | `{}`                                                 | `{ dropletId, inReview: true, round, changed, reviewsCarried?, commentsCarried? }`                    |
| `withdraw-review` | `{}`                                                 | `{ dropletId, inReview: false, changed }`                                                             |
| `send-feedback`   | `{ reviewerId, summaryNote? }` (note ≤ 5000 or null) | `{ dropletId, reviewId, inReview: false, announced }`                                                 |
| `publish-review`  | `{ reviewerId, originalDropletId: int \| null }`     | `{ slug, dropletId, reviewId }`, plus `{ originalDropletId, lessons, enrollmentsMoved }` for `[EDIT]` |

- **Statuses:** 400 (body, a Strapi `ValidationError` as `<Action> failed (<reason>, field: <path>). Nothing was changed.`, and for `[EDIT]` publish the `preparePublishEdit` guards: missing difficulty, an empty draft over a live droplet with lessons, a lesson that would be left empty), 404 (draft gone, no review of the caller's for this round, or for `[EDIT]` publish the original droplet no longer exists), 409, 500 (`<Action> failed. Nothing was changed. Try again.`). 409 means: already published; Send/Publish when not in review; the review was already sent; `publish-review` with a null `originalDropletId` on an `[EDIT]` draft; or the Overall guard, which names the missing criteria. Zero active criteria pass the guard.
- **Trust boundary:** the routes trust `reviewerId`. The Next.js actions (`lib/requests/reviews.ts`) enforce `isReviewerFor` and refuse authors.
- **Lock order:** every route runs in one `strapi.db.transaction()`, locks the draft row with `forUpdate`, then re-reads it. `publish-review` for `[EDIT]` locks the draft, then the original (same as publish-edit). Send and Publish on one draft are serialized: the loser gets 409 or 404.
- **Idempotency (G18):** a repeat Submit or Withdraw is 200 with `changed: false`, so the actions don't pre-refuse on `inReview`. Submit or Withdraw on a published droplet is 409.
- **Submit carry-over (G4):** `droplet.reviewRound` goes up (lifecycle hook), then each reviewer's latest review is carried to the new round (reviews with reviewer slot 0 are skipped). An open review keeps its row, with `round` and `key` re-set. A sent review stays as history, and gets a new open review with copies of its unresolved top-level comments and their replies (`parent` remapped, any depth). Orphaned `blocks` comments are skipped and no scores are copied. Each copy's `carriedFrom` points at the comment as first written (a copy of a copy points at the original, not at the copy), and the creator's `addressedAt` mark is copied with it (ODY-807).
- **Send:** marks the caller's open review `sent` (with `sentAt` and optional `summaryNote`), sets `inReview: false`, and creates one `review_feedback` announcement per author.
- **Publish:** needs an open review with a confirmed Overall score for every active criterion. `[EDIT]` runs `applyPublishEdit`, `moveReviewsToLive` (the caller's review becomes `published`), one `review_published` announcement per author (attached to the live droplet, addressed to that author) and `deleteEditDraft`. A new droplet is set `published` with `inReview: false` in place. Announcement text never mentions AI.
- **Known gap (G9):** ODY-802's comment REST writes are not serialized with Publish. A comment written while Publish runs can land on a draft lesson that is then deleted. Documented, not fixed.

## Database

PostgreSQL via `DATABASE_*` env variables. Local dev uses Docker Compose (`docker-compose.yml`) with a `strapiDB` service. Production uses AWS RDS.

Seed data: `initdb/data.sql` runs on first Docker Compose startup to populate the database from a `pg_dump` of the dev server.

- **Join tables renamed in v5:** `*_links` to `*_lnk`, `*_components` to `*_cmps`, `files_related_morphs` to `files_related_mph`. Index names keep the old names, and the migration is one-way. Raw SQL must use the new names; `scripts/strapi-v5-cutover/unpublished-rows/01`/`02` use the v4 names on purpose and `03` still does until playbook 2.2.
- **No DB unique index on uid/slug fields in v5**, so two concurrent creates can race.
- `unique: true` is app-level only (a SELECT before INSERT). For a real guard, declare a top-level `indexes` entry in schema.json (see `review-score`). Edit such schemas by hand, not in the Content-Type Builder.

## Config on v5

- **S3:** credentials go only in `s3Options.credentials`, and only when both keys are set (`backend/config/plugins.ts`).
- **CSP:** write every directive out in full, including `'self'` (`backend/config/middlewares.ts`).
- **Webhooks:** `webhooks.populateRelations` is gone.
- **REST `defaultLimit` is 25** (`backend/config/api.ts`), so unpaginated list requests silently cap at 25 rows.
