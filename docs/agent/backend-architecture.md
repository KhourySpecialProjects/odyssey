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
├── review-comment/       Anchored review comments (replies via parent)
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
- **Highlight** — Text selection with `color` (pink #f9a8d4, yellow #fff300, lime #86efac, blue #93c5fd, orange #fbd38d), `selectedText`, `startOffset`/`endOffset` for position.
- **Friendship** — Bidirectional with status: pending, accepted, rejected, blocked.
- **Tag** — Simple `name` field, many-to-many with Droplet.

### Review (ODY-798)

Five types, all `draftAndPublish: false`. Relations to droplet, lesson, authorized-user and criterion are one-way manyToOne; `review` has two-way `comments`, `scores` and `aiScoringRuns`.

- **Review** — `round` is the droplet's submission number, shared by all reviewers. `key` = `<dropletId>:<reviewerId>:<round>` (unique index `reviews_key_uq`). `state`: open, sent, published; withdrawing keeps the open review. `round` is `droplet.reviewRound` when the review opens.
- **ReviewComment** — `field` (blocks, description, overview, objective), JSON `anchor`, `body` (max 5000), optional `parent` for replies. No lesson means the droplet-level fields.
- **ReviewScore** — `value` and `aiValue` are 1-5 (nullable), `criterionName` is a snapshot. `key` = `<reviewId>:<lessonId|overall>:<criterionId>` (unique index `review_scores_key_uq`). No lesson means Overall.
- **AiScoringRun** — `runState` (queued, running, done, partial, failed), not `status`: the content-manager extension wraps any model with a `status` attribute. Stores `inputTokens`/`outputTokens` only, no `costUsd`.
- **ReviewCriterion** — Router has no `delete` route; retire with `active: false`. `name` is unique (`review_criteria_name_uq`). `backend/src/lib/review-criteria-seed.ts` seeds five criteria on boot only when the table is empty.
- **`droplet.reviewRound`** — The droplet lifecycle owns the counter: `beforeCreate` sets 1 if `inReview` else 0, and `beforeUpdate` adds 1 when `inReview` goes from not-true to true. Client and admin edits to it are ignored (the admin field shows as editable but a save has no effect).
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

Run the backend tests with `npm --prefix backend test` (see `testing-and-deployment.md`).

### Publish-edit route (`custom-droplet` controller)

`POST /api/droplets/:id/publish-edit` (ODY-800; tests in `tests/api/publish-edit.test.js`). Logic lives in plain modules, not `services/` (Strapi auto-loads those): `src/lib/publish-edit.ts` and `src/lib/lesson-sync.ts`.

- **Request:** `:id` is the draft's numeric id or documentId (anything else is a 404). The body is `{ originalDropletId }` and nothing else: any other key is 400 `Invalid key <k>`, and the id must be a safe integer, > 0 and <= 2147483647. Custom routes skip strict REST, so the controller checks this itself.
- **Responses:**
  - `200 { data: { slug, originalDropletId, lessons: { updated, unchanged, created, deleted }, enrollmentsMoved } }`.
  - `404`: the draft is gone (`DRAFT_GONE_MESSAGE`, "This draft no longer exists. It may already have been published."), or the original is.
  - `409`: no `originalDropletId`, it differs from the body's, the draft is already `published`, or `:id` is the original.
  - `400`: guards (missing difficulty, an empty draft over a live droplet with lessons, a lesson that would be left empty) and a Strapi `ValidationError` during the writes, as `Publishing failed (<reason>, field: <path>). Nothing was changed.` (lesson errors read `lesson "X": <reason>`).
  - `500`: `Publishing failed. Nothing was changed. Try again.`
- **ODY-804 seam:** `preparePublishEdit` (locks, reads, guards, plans) then `applyPublishEdit` (writes; returns `lessonMap`, draft lesson id to live lesson id) then `deleteEditDraft`. `publishEdit` composes them in one `strapi.db.transaction()`, and each step throws unless `strapi.db.inTransaction()`. Never catch a DB error inside the transaction and carry on (see the learning `2026-10-26-strapi-v5-transactions.md`).
- **Row locks:** the first statements lock the draft row, then the original, with `queryBuilder(...).forUpdate()` (the only Query Engine use here). A second publish of the same draft waits, then finds the draft gone and gets 404. Only Postgres enforces this; SQLite ignores `forUpdate`.
- **Lesson create slug:** each create sends `publish-<uuid>`. Uid uniqueness is validated before `beforeCreate` swaps in the real slug, so a fixed placeholder would collide once any lesson stored it.
- **Strapi 5.56 source facts:** every Document Service call joins an outer `strapi.db.transaction()`; `entry.*` events and webhooks are deferred to the outermost commit and never sent on rollback; lifecycle hooks run inside the transaction (voyage-claim marking rolls back too); deleting the draft does not cascade to related entries (enrollments keep a null link); the Document Service `findMany` has no 25-row cap (that is REST only).
- **Frontend (`publishDraftToOriginal`):** `checkPublishDraft` (`lib/auth/review-freeze.ts`, ODY-810) reads the draft fresh and applies `isReviewerFor`: in review, a System Admin or Content Editor who isn't an author; otherwise a System Admin, or a Faculty author. It also refuses when the draft's `originalDropletId` differs from the argument. A second fresh read gets the draft's `documentId`, and the action refuses when it has none (no numeric fallback). Then one POST. It revalidates on 2xx, 5xx and network errors but not 4xx, and shows "could not be confirmed" for a network error or a gateway 5xx without a Strapi message, since the publish may have committed.

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
