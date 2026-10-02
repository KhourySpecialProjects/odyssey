# Data Fetching & Caching

## fetchAPI — The Single Entry Point

All Strapi GET requests on the frontend go through `fetchAPI()` in `frontend/lib/utils.ts`. It handles query string building, auth headers, response flattening, and cache configuration in one function.

```typescript
const droplets = await fetchAPI<Droplet[]>("/droplets", {
  urlParams: {
    filters: { status: { $eq: "published" } },
    populate: { tags: true, lessons: { fields: ["name", "slug"] } },
    sort: ["name:asc"],
    pagination: { pageSize: 25 },
  },
  next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
});
```

**What fetchAPI does internally:**

1. Serializes `urlParams` with `qs.stringify()` (handles nested Strapi filter/populate syntax)
2. Adds `Authorization: Bearer ${STRAPI_ACCESS_TOKEN}` header
3. Adds `Content-Type: application/json`
4. Passes `next` or `cache` option to the underlying `fetch()` call
5. Calls `flattenAttributes()` on `data.data` by default (set `flattenResponse: false` to skip)
6. Throws on non-2xx responses with status code in the error message

### The cache/next Mutual Exclusion Rule

In Next.js 15, the `cache` and `next` options on `fetch()` are **mutually exclusive**. Passing both causes Next.js to silently ignore both — no error, no warning, just broken caching.

```typescript
// CORRECT — cached with tags
fetchAPI("/droplets", {
  next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
});

// CORRECT — uncached
fetchAPI("/droplets", { cache: "no-store" });

// BROKEN — both options present, Next.js ignores both silently
fetchAPI("/droplets", {
  cache: "force-cache",
  next: { tags: [CACHE_TAGS.droplets] },
});
```

`fetchAPI()` includes a dev-only guard that throws an explicit error if both options are passed (only in `NODE_ENV=development`).

## Request Functions

One file per content type in `frontend/lib/requests/`:

```
requests/
├── analytics.ts              Analytics data aggregation
├── authorized-user.ts        User CRUD, batch creation, profile updates
├── authorized-user-roles.ts  Role lookups
├── cached.ts                 React cache() wrappers for deduplication
├── data.ts                   General data utilities
├── droplet.ts                Droplet CRUD, search, filtering
├── enrollment.ts             Enrollment creation, completion, rating
├── enrollment-populates.ts   Reusable populate presets for enrollments
├── feed.ts                   Announcement queries
├── friends.ts                Friendship management
├── galleries.ts              Gallery queries
├── groups.ts                 Group CRUD, membership
├── highlights.ts             Text highlight creation/deletion
├── lesson.ts                 Lesson CRUD, ordering
├── notes.ts                  Note creation, positioning
├── playlist.ts               Playlist CRUD, enrollment
├── playlist-enrollment.ts    Playlist-specific enrollment logic
├── posthog.ts                PostHog event helpers
├── tag.ts                    Tag CRUD
├── user-activity.ts          Activity tracking
└── user-populates.ts         Reusable populate presets for users
```

Every request function calls `fetchAPI()`. The pattern:

```typescript
export async function getDropletBySlug(slug: string): Promise<Droplet | null> {
  const droplets = await fetchAPI<Droplet[]>("/droplets", {
    urlParams: {
      filters: { slug: { $eq: slug } },
      populate: {
        /* fields needed for this view */
      },
    },
    next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
  });
  return droplets?.[0] ?? null;
}
```

### Populate Presets

Common populate configurations are extracted into dedicated files to avoid duplication:

- `enrollment-populates.ts` — Presets: `minimal` (just IDs), `withLessonIds` (includes viewedLessons), `dashboard` (includes droplet name/slug/lessons for progress display), `favorites` (includes droplet with tags)
- `user-populates.ts` — Presets for user data at different detail levels

Import and spread these into `urlParams.populate` instead of duplicating populate objects.

## Per-Request Deduplication

`frontend/lib/requests/cached.ts` wraps common request functions with React's `cache()`:

```typescript
import { cache } from "react";

export const getCachedUser = cache(async (userId: number) => {
  return getAuthorizedUserById(userId);
});

export const getCachedEnrollments = cache(async (userId: number) => {
  return getEnrollmentsByUser(userId);
});

export const getCachedDropletBySlug = cache(async (slug: string) => {
  return getDropletBySlug(slug);
});
```

**What `cache()` does:** Deduplicates identical calls within a single server render. If three Server Components on the same page all call `getCachedUser(42)`, Strapi is hit once. The cache lasts for the duration of one HTTP request — not across requests.

**When to use cached wrappers:** In Server Components where the same data is needed by multiple components in the same render tree. Don't use them in Server Actions or API routes.

## Cache Invalidation

### Tag System

All cache tags are defined in `frontend/lib/cache-tags.ts`. Two scoping levels:

**Global tags** — shared across all users:

- `CACHE_TAGS.droplets`, `CACHE_TAGS.playlists`, `CACHE_TAGS.authors`, `CACHE_TAGS.lesson`
- `CACHE_TAGS.announcements`, `CACHE_TAGS.tags`, `CACHE_TAGS.reports`
- `CACHE_TAGS.accessRequests`, `CACHE_TAGS.creationRequests`
- `CACHE_TAGS.allGroups`, `CACHE_TAGS.allDueDates`, `CACHE_TAGS.allEnrollments`
- `CACHE_TAGS.users`

**Per-user tags** — scoped to individual users (functions that return a string):

- `CACHE_TAGS.enrollments(userId)` → `"enrollments-{userId}"`
- `CACHE_TAGS.friendships(userId)` → `"friendships-{userId}"`
- `CACHE_TAGS.notes(userId)` → `"notes-{userId}"`
- `CACHE_TAGS.highlights(userId)` → `"highlights-{userId}"`

### Invalidation Pattern

Every Server Action that mutates data must call `revalidateTag()`:

```typescript
// In a Server Action (lib/actions.ts)
export async function completeLesson(
  enrollmentId: number,
  lessonId: number,
  userId: number,
) {
  // ... mutation logic ...
  revalidateTag(CACHE_TAGS.enrollments(userId)); // per-user cache
  revalidateTag(CACHE_TAGS.droplets); // global cache (if completion affects display)
}
```

**Rules:**

- Never hardcode tag strings — always use `CACHE_TAGS` constants
- Per-user mutations invalidate the per-user tag (e.g., `enrollments(userId)`)
- Content mutations that affect all users also invalidate the global tag (e.g., `CACHE_TAGS.allEnrollments`)
- See the full invalidation matrix in the docblock at the top of `cache-tags.ts`

### Default Revalidation Times

- Most content: 900 seconds (15 minutes)
- Tags: 3600 seconds (1 hour) — tags change rarely
- Uncached fetches (`cache: "no-store"`): used for data that must be fresh on every load (e.g., real-time enrollment status during lesson completion)

## Strapi Query Patterns with qs

The `qs` library serializes nested JavaScript objects into Strapi's query string format:

```typescript
import qs from "qs";

// Filtering
{ filters: { status: { $eq: "published" }, type: { $in: ["knowledge", "skill"] } } }

// Nested relation filtering
{ filters: { tags: { name: { $containsi: "python" } } } }

// Populate with field selection
{ populate: { lessons: { fields: ["name", "slug", "orderIndex"] } } }

// Deep populate
{ populate: { lessons: { populate: { notes: true } } } }

// Sorting
{ sort: ["name:asc", "createdAt:desc"] }

// Pagination
{ pagination: { page: 1, pageSize: 25 } }
// or
{ pagination: { start: 0, limit: 25 } }
```

`fetchAPI()` passes `urlParams` directly to `qs.stringify()` with `encodeValuesOnly: true`. The `qs` library handles the Strapi bracket notation (`filters[status][$eq]=published`) automatically.

## Single entries and relations on Strapi v5

Single-entry REST routes (`/api/droplets/:id`) and relation writes only accept a `documentId`. A numeric id returns 404. Callers still hold numeric ids (fetched data, the session, FormData), so `lib/strapi-document-id.ts` converts them. It is a plain server module, not `"use server"`; never import it from a client component.

- **Single-entry URLs:** build them with `await strapiEntryUrl("droplets", ref, query?)`. For `fetchAPI` paths use `` `/droplets/${await resolveDocumentId("droplets", id)}` ``. `ref` can be a number, a documentId, or the entity itself. Passing an entity that has `documentId` skips the lookup, but only for entities your own server code fetched (see the next bullet). A documentId must match `/^[A-Za-z0-9]+$/`; anything else throws `InvalidEntryRefError`.
- **Relation writes:** every relation value in a POST/PUT body (`connect`, `disconnect`, `set`, or shorthand like `droplet: id`) must be a documentId. Use `entity.documentId` when you have the entity, otherwise `resolveDocumentIds("<target collection>", ids)`. Components and their `id`s are not relations.
- **Exported Server Actions must not trust a client `documentId`:** in every exported function of a `"use server"` file, all arguments are untrusted, and documentIds are not secret (every entity sent to a client carries one). A `documentId` may only be used if it came from a server-side fetch in the same call. For anything that arrived as an argument (including nested objects and arrays such as `data.droplets` or `group.members`), pass only the numeric id: `x.id` or `{ id: x.id }`. When the action already fetched the entity for an auth, ownership or duplicate check, write to that fetched entity so the check and the write always hit the same row. Otherwise a user can pass `{ id: <their own>, documentId: <someone else's> }`, pass the check on their own row, and write to the other. Non-exported helpers and server-to-server calls may pass fetched entities.
- **Filters on `id` are fine:** `filters[id][$eq]=5` still works. Plain reads by id should use the filter, since it needs no lookup.
- **Rendering paths:** don't call the helper while a page renders or inside `unstable_cache` or `cached.ts`. Its lookup uses `cache: "no-store"`, which makes static routes dynamic. Use an `id` filter there.
- **Not found:** the helper throws `StrapiEntryNotFoundError`. Invalid refs (null, NaN, `""`) throw `InvalidEntryRefError`, a subclass. Handle both as you would a Strapi 404.
- **Lock routes:** `/lessons/:id/lock*` take the numeric id until ODY-606. `lesson-lock.ts` stays numeric.
- **Guard:** `testing/lib/strapi-entry-url-guard.test.ts` fails on raw-id single-entry URLs and lists each `file:line`.

Test conventions:

- `jest.setup.ts` mocks the helper globally with an identity mapping (`5` becomes `"5"`, an entity gives its `documentId`), so URL assertions like `/api/droplets/5` keep passing. To prove a documentId is used, override with a non-identity mapping such as `5 -> "doc5"`. `strapi-document-id.test.ts` calls `jest.unmock` to test the real module.
- A test file that calls `jest.resetAllMocks()` wipes that mock and must re-install the identity implementation in `beforeEach`. See `droplet-coverage.test.ts`, `publish-draft-lesson-sync.test.ts`, `groups.test.js` and `voyage-branches.test.ts`.

## Common Mistakes

1. **Using both `cache` and `next` on fetchAPI** — Next.js silently ignores both. Use one or the other.
2. **Forgetting `flattenAttributes()` on raw fetch responses** — Server Actions use raw `fetch()` for PUT/POST/DELETE. The response is wrapped in Strapi's `{ data: { attributes: {} } }` format. Call `flattenAttributes()` manually.
3. **Hardcoding cache tag strings** — Use `CACHE_TAGS` constants. Hardcoded strings won't be found by grep when debugging invalidation issues.
4. **Forgetting `revalidateTag()` after mutations** — The cache serves stale data until explicitly invalidated. Every mutation needs corresponding tag invalidation.
5. **Over-populating queries** — Only populate relations you actually render. Deep populates with `{ populate: "*" }` pull the entire relation graph and are expensive.
6. **Using `getCachedX()` in Server Actions** — React `cache()` only deduplicates within a single render. In Server Actions, call the underlying request function directly.
