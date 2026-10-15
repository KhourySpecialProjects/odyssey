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

## Common Mistakes

1. **Using both `cache` and `next` on fetchAPI** — Next.js silently ignores both. Use one or the other.
2. **Forgetting `flattenAttributes()` on raw fetch responses** — Server Actions use raw `fetch()` for PUT/POST/DELETE. The response is wrapped in Strapi's `{ data: { attributes: {} } }` format. Call `flattenAttributes()` manually.
3. **Hardcoding cache tag strings** — Use `CACHE_TAGS` constants. Hardcoded strings won't be found by grep when debugging invalidation issues.
4. **Forgetting `revalidateTag()` after mutations** — The cache serves stale data until explicitly invalidated. Every mutation needs corresponding tag invalidation.
5. **Over-populating queries** — Only populate relations you actually render. Deep populates with `{ populate: "*" }` pull the entire relation graph and are expensive.
6. **Using `getCachedX()` in Server Actions** — React `cache()` only deduplicates within a single render. In Server Actions, call the underlying request function directly.
