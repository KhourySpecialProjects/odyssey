# Backend Architecture (Strapi 4.22)

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
├── overview: HTML (CKEditor rich text)
├── isHidden: boolean (default: false)
├── averageRating: decimal (0-5, default: 0)
├── funFact: text
├── originalDropletId: integer (links draft copies to published originals)
├── inReview: boolean
├── afterReview: text
│
├── lessons → many-to-many Lesson (via droplet-lesson join table with orderIndex)
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

Droplets and Lessons use Strapi's draft/publish system (`draftAndPublish: true` in schema) for version control. Enrollments do not (`draftAndPublish: false`). Additionally, Droplet has its own application-level `status` field (draft → edit → published) to track editorial workflow, independent of Strapi's publish state. Both systems work in parallel.

## Database

PostgreSQL via `DATABASE_*` env variables. Local dev uses Docker Compose (`docker-compose.yml`) with a `strapiDB` service. Production uses AWS RDS.

Seed data: `initdb/data.sql` runs on first Docker Compose startup to populate the database from a `pg_dump` of the dev server.
