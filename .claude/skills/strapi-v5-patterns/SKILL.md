---
name: strapi-v5-patterns
description: Strapi v5 Document Service, documentId, strict REST, and query building for Odyssey. Use when working with Strapi content types, writing request functions, building populate/filter queries, writing lifecycles, or debugging Strapi API responses.
invocation: auto
---

# Strapi v5 Patterns for Odyssey

## Version Facts

- Strapi 5.56. `production` is still v4 until ODY-603; on a branch cut from it, follow that branch's docs.
- The frontend sends `Strapi-Response-Format: v4` (`STRAPI_RESPONSE_FORMAT_HEADER`), so responses stay `{ data: { id, documentId, attributes } }`. The header changes the shape only.
- Raw `fetch()` must spread the header. Guard: `frontend/testing/lib/strapi-response-format-guard.test.ts`.

## `id` vs `documentId`

| Use                                                         | Which id                                | Why                                |
| ----------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| Filters, comparisons, cache-tag keys, session, PostHog      | numeric `id`                            | Stable across the v5 boot          |
| Single-entry URLs (`strapiEntryUrl`, `resolveDocumentId`)   | `documentId`                            | Numeric ids 404 on v5              |
| Relation writes (`entity.documentId`, `resolveDocumentIds`) | `documentId`                            | v5 rejects numeric relation ids    |
| Exported Server Action arguments                            | numeric `id` only                       | Client `documentId`s are untrusted |
| Lock routes `/lessons/:id/lock*`                            | either (`lesson-lock.ts` sends numeric) | Accepted since ODY-606             |

Detail: `docs/agent/data-fetching.md` ("Single entries and relations on Strapi v5").

## Document Service (backend)

```typescript
const uid = "api::droplet.droplet";
await strapi
  .documents(uid)
  .findOne({ documentId, fields: ["name"], populate: { lessons: true } });
await strapi.documents(uid).findFirst({ filters: { id } }); // by numeric id
await strapi
  .documents(uid)
  .findMany({ filters, sort, pagination: { page: 1, pageSize: 25 } });
await strapi.documents(uid).create({ data });
await strapi.documents(uid).update({ documentId, data });
await strapi.documents(uid).delete({ documentId });
```

- Never `strapi.entityService` (guard: `backend/tests/no-entity-service.test.js`).
- The Query Engine (`strapi.db.query`) is used only inside `strapi.db.transaction` (`acquireLock` in `custom-lesson.ts`).

## Hooks

- House pattern: `lifecycles.ts`. Before hooks only know the numeric id: `findFirst({ filters: { id } })`. After hooks: `findOne({ documentId: result.documentId })`.
- Bulk `*Many` lifecycle hooks never fire from the Document Service.
- The v5 upgrade codemod comments lifecycle files out; check the diff after any codemod.
- Document middlewares (`strapi.documents.use`) are not used here. Adding one needs a ticket.

## Draft & Publish is off

- `draftAndPublish: false` on every type. New types must set it (the Content-Type Builder defaults to on).
- `status` on droplet/voyage is a domain enum. v5 reserves `status` only on D&P types, so boot only warns. Never add `status`/`publishedAt` to a D&P type.
- Never send `publicationState` or the v5 `status` param. A `status` filter means the droplet/voyage enum.

## Strict REST

- An unknown query or body key returns 400 "Invalid key"; `error.details.source` is `query` or `body`.
- Non-schema input keys need `strapi.contentAPI.addInputParams` (`backend/src/index.ts`). `regenerateSlug` is allow-listed for PUT only; POST with it still 400s.
- Guard: `frontend/testing/contract/strapi-query-catalog.test.ts`.
- Smoke scripts (need a running backend): `scripts/ody-635/smoke-queries.sh` (218 PASS), `scripts/ody-700/smoke-regenerate-slug.sh`, `scripts/strapi-v5-delete-204/smoke-delete-204.sh`.

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

// Dynamic zone: nested populate needs `on` per component, or 400 / component dropped
populate: { blocks: { on: { "droplets.quiz": { populate: ["questions"] }, "droplets.generic": true } } }
// NEVER use populate: "*" — it pulls the entire relation graph
```

See `lesson-populates.ts` (`LESSON_BLOCKS_POPULATE`).

### Pagination

```typescript
pagination: { page: 1, pageSize: 25 }   // page-based
pagination: { start: 0, limit: 25 }     // offset-based
```

Without `pagination`, REST returns at most 25 rows (`defaultLimit`, ODY-720). Raw list fetches must paginate.

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

`fetchAPI()` auto-flattens. Raw `fetch()` does NOT. Every Server Action using raw `fetch()` MUST spread the v4 header and call `flattenAttributes()`. In tests, mock `fetchAPI` with already-flat data.

## Common Gotchas

1. `cache` and `next` on fetch are mutually exclusive in Next.js 15 — passing both silently breaks caching
2. Strapi returns `null` for missing relations, not empty arrays — always check for null
3. Lessons have two block formats: check `blocksVersion` field (`v1` = TipTap `blocks`, `v2` = BlockNote `blocksV2`)
4. `droplet-lesson` join table has `orderIndex` for ordering — don't sort lessons by `id`
5. Enrollment `rating` is nullable (1-5) — don't assume it exists
6. Only System Admin is an admin role — check via `isAuthorizedUserAdmin()` in `lib/utils.ts`
7. DELETE returns an empty 204, even for a missing documentId: use `readJsonOrNull` (`lib/strapi-response.ts`), never `res.json()`
8. A create of droplet/lesson/playlist must send a slug (any value): v5 validates required fields before `beforeCreate`, which then replaces it
