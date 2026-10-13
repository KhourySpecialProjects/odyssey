---
name: strapi-v4-patterns
description: Strapi v4.22 Entity Service API patterns, query building, schema reading, and common gotchas. Use when working with Strapi content types, writing request functions, building populate/filter queries, or debugging Strapi API responses.
invocation: auto
---

# Strapi v4.22 Patterns for Odyssey

## CRITICAL: v4 Only

This codebase uses Strapi v4.22. NEVER use v5 patterns:

- Entity Service API (v4) — NOT Document Service API (v5)
- Numeric `id` — NOT `documentId`
- Nested `{ data: { attributes: {} } }` responses — NOT flat responses

## Reading a Schema

Before writing any request function, read the content type's schema:

```
backend/src/api/{type}/content-types/{type}/schema.json
```

The schema tells you every field name, type, relation, enum value, and constraint. Do not guess field names from component code — read the schema.

## Query Building with qs

All queries go through `fetchAPI()` which uses `qs.stringify()`. Common patterns:

### Filtering

```typescript
// Exact match
filters: { status: { $eq: "published" } }

// Multiple values
filters: { type: { $in: ["knowledge", "skill"] } }

// Nested relation filter
filters: { tags: { name: { $containsi: "python" } } }

// Combined
filters: {
  status: { $eq: "published" },
  focusArea: { $eq: "technical" },
  isHidden: { $eq: false }
}
```

### Populating Relations

```typescript
// Simple: just get IDs
populate: { tags: true }

// With field selection (reduces payload)
populate: { lessons: { fields: ["name", "slug", "orderIndex"] } }

// Deep populate
populate: {
  lessons: {
    populate: { notes: true, highlights: true }
  }
}

// NEVER use populate: "*" — it pulls the entire relation graph
```

### Pagination

```typescript
pagination: { page: 1, pageSize: 25 }   // page-based
pagination: { start: 0, limit: 25 }     // offset-based
```

### Sorting

```typescript
sort: ["name:asc"];
sort: ["createdAt:desc", "name:asc"];
```

## Request Function Pattern

Every function in `lib/requests/` follows:

```typescript
export async function getDropletsByFilter(
  focusArea: string,
): Promise<Droplet[]> {
  return fetchAPI<Droplet[]>("/droplets", {
    urlParams: {
      filters: { focusArea: { $eq: focusArea }, status: { $eq: "published" } },
      populate: { tags: true, lessons: { fields: ["name", "slug"] } },
      sort: ["name:asc"],
    },
    next: { tags: [CACHE_TAGS.droplets], revalidate: 900 },
  });
}
```

Rules: one function per query purpose, always specify `next.tags` with `CACHE_TAGS`, default revalidation 900s, only populate what you render.

## Populate Presets

Reusable configs in `enrollment-populates.ts` and `user-populates.ts`. Pass preset directly: `populate: ENROLLMENT_POPULATES.dashboard`.

## The flattenAttributes Rule

`fetchAPI()` auto-flattens. Raw `fetch()` does NOT. Every Server Action using raw `fetch()` MUST call `flattenAttributes()` manually. In tests, mock `fetchAPI` with already-flat data.

## Common Gotchas

1. `cache` and `next` on fetch are mutually exclusive in Next.js 15 — passing both silently breaks caching
2. Strapi returns `null` for missing relations, not empty arrays — always check for null
3. Lessons have two block formats: check `blocksVersion` field (`v1` = TipTap `blocks`, `v2` = BlockNote `blocksV2`)
4. `droplet-lesson` join table has `orderIndex` for ordering — don't sort lessons by `id`
5. Enrollment `rating` is nullable (1-5) — don't assume it exists
6. Only System Admin is an admin role — check via `isAuthorizedUserAdmin()` in `lib/utils.ts`
