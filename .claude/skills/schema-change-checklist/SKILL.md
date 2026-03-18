---
name: schema-change-checklist
description: Step-by-step checklist for modifying Strapi content types. Use when adding, removing, or changing fields on any Strapi schema, or when modifying relations between content types. Ensures all downstream files are updated.
invocation: auto
---

# Schema Change Checklist

When a Strapi content type schema changes, the ripple effect touches 6-8 files minimum. Missing any one of them causes silent bugs (stale data, missing fields, type errors).

## The Checklist

For every schema field change (add, remove, rename, change type):

### 1. Schema (source of truth)

- [ ] `backend/src/api/{type}/content-types/{type}/schema.json` — make the change here first

### 2. TypeScript Types

- [ ] `frontend/types/` — update the TypeScript interface for this content type
- [ ] Check if any other types reference this one (grep for the type name in `frontend/types/`)

### 3. Request Functions

- [ ] `frontend/lib/requests/{type}.ts` — update populate/filter queries to include new fields or remove old ones
- [ ] Check populate presets: `enrollment-populates.ts`, `user-populates.ts` — do any presets need the new field?

### 4. Cache Tags

- [ ] `frontend/lib/cache-tags.ts` — does a new tag need to be added? Does the invalidation matrix docblock need updating?
- [ ] If a new mutation is added, add `revalidateTag()` calls to the corresponding Server Action

### 5. Server Actions

- [ ] `frontend/lib/actions.ts` — if the field is writable, does a Server Action create/update it?
- [ ] Does the Zod validation schema in `frontend/lib/validations/{type}.ts` need the new field?

### 6. Components

- [ ] Grep for the content type name in `frontend/components/` — which components render this data?
- [ ] Do any components need to display the new field or stop displaying a removed field?

### 7. Tests

- [ ] Update mock data in `frontend/testing/mocks/` to include the new field shape
- [ ] Update any tests that assert on the old field structure
- [ ] Write new tests for new behavior

### 8. Reference Docs

- [ ] `docs/agent/backend-architecture.md` — update the domain model section if a relation changed

## Relation Changes (extra steps)

If you're adding or modifying a relation (manyToMany, manyToOne, oneToMany):

- [ ] Check both sides of the relation — Strapi requires `inversedBy`/`mappedBy` to match
- [ ] Update populate queries on BOTH content types
- [ ] Check if the inverse side's request functions need updating
- [ ] Verify the join table (if applicable) is handled correctly

## Field Removal (extra steps)

Removing a field is more dangerous than adding one:

- [ ] Grep the entire frontend for the field name — find every reference
- [ ] Check if any Zod schema validates this field
- [ ] Check if any cache tag invalidation depends on mutations to this field
- [ ] Run `cd frontend && npm test` to catch type errors from missing fields

## Verification

After making all changes:

```bash
cd frontend && npm test          # Catch type errors and broken tests
cd frontend && npm run build     # Catch any build-time TypeScript errors
```

If tests and build pass, the change is likely complete. If either fails, the error messages will point to files you missed.
