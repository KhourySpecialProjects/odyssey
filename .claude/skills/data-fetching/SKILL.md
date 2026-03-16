---
name: data-fetching
description: Data fetching, caching, and cache invalidation patterns for Odyssey. Use when writing request functions, debugging stale data, adding cache tags, or implementing Server Actions that mutate data.
---

# Data Fetching Patterns for Odyssey

## The Golden Rule

All Strapi GET requests go through `fetchAPI()` in `lib/utils.ts`. All mutations go through Server Actions in `lib/actions.ts` using raw `fetch()`.

## Writing a New Request Function

### Template

```typescript
// lib/requests/{content-type}.ts
import { fetchAPI } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache-tags";

export async function getThingsByFilter(filterValue: string): Promise<Thing[]> {
  return fetchAPI<Thing[]>("/things", {
    urlParams: {
      filters: { field: { $eq: filterValue } },
      populate: {
        // Only populate what you render
        relation: { fields: ["name", "slug"] },
      },
      sort: ["name:asc"],
    },
    next: { tags: [CACHE_TAGS.things], revalidate: 900 },
  });
}
```

### Checklist Before Writing

1. **Read the schema first:** `backend/src/api/{type}/content-types/{type}/schema.json`
2. **Check if a similar function exists:** `Grep` for the content type in `lib/requests/`
3. **Choose the right cache tag:** Check `lib/cache-tags.ts` for existing tags
4. **Decide on populate depth:** Only populate fields you'll render. Never `populate: "*"`

## Cache Tag System

### Tag Types

**Global tags** — shared across all users:

```typescript
CACHE_TAGS.droplets; // all droplet queries
CACHE_TAGS.playlists; // all playlist queries
CACHE_TAGS.lesson; // all lesson queries
CACHE_TAGS.tags; // all tag queries
CACHE_TAGS.announcements; // feed queries
CACHE_TAGS.users; // user listing queries
CACHE_TAGS.allEnrollments; // admin enrollment views
```

**Per-user tags** — scoped to individual users:

```typescript
CACHE_TAGS.enrollments(userId); // "enrollments-{userId}"
CACHE_TAGS.friendships(userId); // "friendships-{userId}"
CACHE_TAGS.notes(userId); // "notes-{userId}"
CACHE_TAGS.highlights(userId); // "highlights-{userId}"
```

### Adding a New Cache Tag

1. Add the constant to `lib/cache-tags.ts`
2. Use it in the request function's `next.tags`
3. Add `revalidateTag()` call in every Server Action that mutates this data
4. If per-user scoped, use the function form: `CACHE_TAGS.myTag(userId)`

## Invalidation Pattern

Every Server Action that mutates data MUST invalidate the cache:

```typescript
// lib/actions.ts
"use server";

export async function updateThing(
  thingId: number,
  userId: number,
  data: ThingInput,
) {
  const parsed = thingSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.message);

  const response = await fetch(`${STRAPI_URL}/api/things/${thingId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ data: parsed.data }),
  });

  if (!response.ok)
    throw new Error(`Failed to update thing: ${response.status}`);

  const json = await response.json();
  const result = flattenAttributes(json.data); // REQUIRED for raw fetch

  revalidateTag(CACHE_TAGS.things); // global invalidation
  // revalidateTag(CACHE_TAGS.enrollments(userId)); // per-user if applicable

  return result;
}
```

### Invalidation Matrix

| Mutation                | Tags to invalidate                                            |
| ----------------------- | ------------------------------------------------------------- |
| Create/update droplet   | `CACHE_TAGS.droplets`                                         |
| Create/update lesson    | `CACHE_TAGS.lesson`, `CACHE_TAGS.droplets`                    |
| Enroll/complete/rate    | `CACHE_TAGS.enrollments(userId)`, `CACHE_TAGS.allEnrollments` |
| Add/remove friend       | `CACHE_TAGS.friendships(userId)`                              |
| Create/delete note      | `CACHE_TAGS.notes(userId)`                                    |
| Create/delete highlight | `CACHE_TAGS.highlights(userId)`                               |
| Update user profile     | `CACHE_TAGS.users`                                            |
| Publish announcement    | `CACHE_TAGS.announcements`                                    |

## The flattenAttributes Rule

| Method                          | Auto-flattens? | Action needed                                |
| ------------------------------- | -------------- | -------------------------------------------- |
| `fetchAPI()`                    | Yes            | None — returns flat data                     |
| Raw `fetch()` in Server Actions | No             | Call `flattenAttributes(json.data)` manually |
| In tests                        | N/A            | Mock `fetchAPI` with flat data               |

## Populate Presets

Reuse existing populate configs instead of duplicating:

```typescript
import { ENROLLMENT_POPULATES } from "@/lib/requests/enrollment-populates";
import { USER_POPULATES } from "@/lib/requests/user-populates";

// Pass preset directly as populate value (no spread needed)
getEnrollmentsByAuthorizedUser(userId, {
  populate: ENROLLMENT_POPULATES.dashboard,
});
```

Available presets:

- `ENROLLMENT_POPULATES.minimal` — just IDs
- `ENROLLMENT_POPULATES.withLessonIds` — includes viewedLessons
- `ENROLLMENT_POPULATES.dashboard` — droplet name/slug/lessons for progress
- `ENROLLMENT_POPULATES.favorites` — droplet with tags

## Common Mistakes

1. **`cache` + `next` together** — Mutually exclusive in Next.js 15. Passing both silently breaks caching.
2. **Forgetting `flattenAttributes()`** — Raw `fetch()` returns nested Strapi format. Must flatten manually.
3. **Hardcoded tag strings** — Always use `CACHE_TAGS` constants. Hardcoded strings break grep-based debugging.
4. **Missing `revalidateTag()`** — Cache serves stale data until explicitly invalidated.
5. **Over-populating** — Only populate relations you render. Deep populates are expensive.
6. **Using `getCachedX()` in Server Actions** — `cache()` only works within a single render, not in actions.
7. **Per-user tag without userId** — `CACHE_TAGS.enrollments` doesn't exist. Use `CACHE_TAGS.enrollments(userId)`.

## Per-Request Deduplication

Wrap frequently-reused fetches with React `cache()` in `lib/requests/cached.ts`:

```typescript
import { cache } from "react";

export const getCachedThing = cache(async (id: number) => {
  return getThingById(id);
});
```

Use `getCachedX()` in Server Components when multiple components need the same data. The cache lasts one HTTP request — not across requests.
