# Backend Architecture (Strapi 4.22)

**On `feature/strapi-v5` branches the backend is v5; see the note in `CLAUDE.md` "Critical Version Constraints". There, v5 patterns are expected, not version violations. The v4-only rules apply to `develop`.**

## Critical Constraint

This is **Strapi v4.22**, not v5. The differences are breaking:

- **Entity Service API** (v4) — not Document Service API (v5)
- **Numeric `id`** fields — not `documentId` strings (v5)
- **Nested `{ data: { attributes: {} } }` responses** — not flat responses (v5)
- Custom routes use `createCoreRouter` / `createCoreController` patterns

Never use Strapi v5 patterns. If you find v5 docs online, they will not work.

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
├── announcement/         Feed items (friend, system, group, kudos, droplet, playlist)
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

- **Announcement** — Feed items. Types: droplet, playlist, friend, system, group, kudos. Relations to droplet, playlist, group, sender/receiver users.
- **Note** — User annotation on a lesson. Has `content` (text), `yPosition` (vertical placement), linked to enrollment and lesson.
- **Highlight** — Text selection with `color` (pink #f9a8d4, yellow #fff300, lime #86efac, blue #93c5fd, orange #fbd38d), `selectedText`, `startOffset`/`endOffset` for position.
- **Friendship** — Bidirectional with status: pending, accepted, rejected, blocked.
- **Tag** — Simple `name` field, many-to-many with Droplet.

## Strapi API Patterns

### Entity Service API (v4)

```javascript
// Find with populate
strapi.entityService.findMany("api::droplet.droplet", {
  filters: { status: "published" },
  populate: { lessons: true, tags: true },
  sort: { createdAt: "desc" },
  pagination: { page: 1, pageSize: 25 },
});

// Create
strapi.entityService.create("api::enrollment.enrollment", {
  data: { authorizedUser: userId, droplet: dropletId, isComplete: false },
});

// Update
strapi.entityService.update("api::enrollment.enrollment", enrollmentId, {
  data: { isComplete: true, completionDate: new Date() },
});
```

### Response Shape (v4)

Strapi v4 wraps responses in `{ data: { id, attributes: { ... } } }` for single items and `{ data: [{ id, attributes: { ... } }] }` for collections. Relations are nested inside `{ data: { ... } }` wrappers.

`fetchAPI()` auto-flattens this on the frontend. When using raw `fetch()` in Server Actions, call `flattenAttributes()` manually.

### Draft & Publish

Strapi Draft & Publish is **off on every content type** (`draftAndPublish: false`), turned off in ODY-633 ahead of Strapi v5, where `status` is reserved on D&P types. Visibility is controlled only by Odyssey fields:

- Droplet: `status` (draft → edit → published) and `isHidden`
- Voyage: `status` and `isArchived`
- Playlist: `isPublic` and `isArchived`

Droplet `isHidden`/`status` and voyage `isArchived` only filter listings: `/d/[slug]` and its lesson pages stay reachable by URL (ODY-660). Voyage `status` (non-staff) and playlist `isPublic` (non-enrolled) do gate their slug pages. Lessons have no visibility field. Don't send `publicationState` or `publishedAt`. New content types must set `draftAndPublish: false`, since the admin's Content-Type Builder turns it on by default and turning it off later triggers the hard delete below.

**Gotcha:** in Strapi v4, turning D&P off on a content type hard-deletes every row with `published_at IS NULL` on the next boot, before migrations run. Back-fill `published_at` first. See `scripts/ody-633/` and `docs/playbooks/strapi-prod-migration-day.md`.

Publishing an `[EDIT]` draft (`publishDraftToOriginal`) syncs lessons in place instead of recreating them. Each draft lesson is matched to a live lesson by `originalLessonId` (recorded when `duplicateDroplet` clones the draft), then by exact name; position is never used. A matched lesson is updated with only the fields that changed, so it keeps its id and slug (even if renamed) and everything keyed to it: students' `viewedLessons`, notes and highlights. Slugs of kept lessons never change. Draft lessons with no match are created, and live lessons missing from the draft are deleted. Writes happen in this order: the droplet's metadata, lesson updates, lesson creates, lesson deletes, and only then the draft's own enrollments move and the draft is deleted. Deletes run last, after every update and create has succeeded, so a failure part way never leaves students with fewer lessons; it returns `{ ok: false }`, keeps the draft, and publishing again finishes the job.

### Lifecycle hooks on Strapi v5

Hooks live in `src/api/*/content-types/*/lifecycles.ts` (droplet, lesson, playlist, creation-request, access-request). They are tested against a real v5 instance (ODY-599); facts checked in the Strapi 5.56.0 source and confirmed by those tests:

- **One call per operation.** With Draft & Publish off, the document service's `create`, `update` and `delete` each make one `db.query` call, so `beforeCreate`/`afterCreate`/`beforeUpdate`/`afterUpdate` fire once per operation. Nothing runs twice for a "draft" and a "published" version, so Slack sends happen once. `event.params.where.id` is still the numeric row id.
- **Required fields are validated before `beforeCreate`.** A create without `slug` fails with `slug must be defined`, even though the hook would generate one. Required checks used to be skipped because new rows were drafts, and D&P is now off. **Contract:** REST and document-service creates of droplets, lessons and playlists must send a slug (any value); `beforeCreate` replaces it with one generated from `name`. Every frontend create already does (`"random"` in `createDroplet`/`addLesson`, `tempSlug` in `createPlaylist`, `placeholderSlug` in the lesson sync, real slugs when duplicating). Tests assert the rejection.
- **A missing dynamic zone arrives as `[]`.** v5 fills `blocks: []` before `beforeCreate`, and the lesson create guard (`!data.blocks`) treats `[]` as present, so a lesson with no content can be created. That is relied on: the draft editor's "Add lesson" calls `addLesson` with `blocks: []` and no `blocksV2` to create a blank lesson, filled in later. Don't tighten the create guard without changing that caller. The update-path guard does check array length.
- **Unknown data keys survive** the entity validator, so `regenerateSlug` reaches `beforeUpdate` through the document service, entity service and admin, and the hook deletes it. The REST controller rejects it earlier with `400 Invalid key` (ODY-700).
- **The Entity Service is gone from `backend/src`** (ODY-606); `tests/no-entity-service.test.js` fails on any `entityService` usage. Inside hooks:
  - **Before hooks** only know the numeric row id, so use `strapi.documents(uid).findFirst({ filters: { id: event.params.where.id }, fields, populate })`. It is one query and needs no documentId.
  - **After hooks** have `result.documentId`, so use `strapi.documents(uid).findOne({ documentId: result.documentId, fields, populate })`.
  - Relations come back as arrays of populated entries, and `populate: { blocks: true }` loads the lesson dynamic zone.
- **`plugin::content-manager.uid` `generateUIDField` keeps its signature**, so `lib/lifecycle-utils.ts` `generateSlug` works unchanged.
- **Slack sends are a no-op unless `NODE_ENV=production`** (`lib/slack.ts`), so tests switch it on per test and count `fetch` calls to the webhook URL.

### Lesson lock routes (`custom-lesson` controller)

`POST/DELETE /api/lessons/:id/lock`, `PUT /api/lessons/:id/lock/heartbeat` and `GET /api/lessons/:id/lock-status` (tested in `tests/api/lesson-lock.test.js`):

- **`:id` is a numeric id or a documentId** (`/^\d+$/` or `/^[A-Za-z0-9]+$/`; anything else is a 404), so the frontend can move to documentIds later. It still sends numeric ids. Request and response shapes, statuses and messages are unchanged.
- **Lookup, release and heartbeat** use the Document Service (`findFirst`, then `update({ documentId })`). `documents.update` runs the lesson `beforeUpdate` hook, which does nothing here because the data has no `blocks`/`blocksV2` or `regenerateSlug`.
- **`acquireLock` stays on the Query Engine** (`strapi.db.query`) inside `strapi.db.transaction`. A throw after its write rolls the write back (tested). The Query Engine is not deprecated.
- **Known race, not fixed (pre-existing):** on Postgres (READ COMMITTED) two concurrent acquires can both read "unlocked" and both write, because the transaction does not serialize them. A real fix needs a conditional update (compare-and-swap in one `UPDATE ... WHERE`) or a row lock (`SELECT ... FOR UPDATE`). Worth its own ticket.

Run the backend tests with `npm --prefix backend test` (see `testing-and-deployment.md`).

## Database

PostgreSQL via `DATABASE_*` env variables. Local dev uses Docker Compose (`docker-compose.yml`) with a `strapiDB` service. Production uses AWS RDS.

Seed data: `initdb/data.sql` runs on first Docker Compose startup to populate the database from a `pg_dump` of the dev server.
