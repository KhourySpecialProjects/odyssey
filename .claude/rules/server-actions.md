---
paths:
  - "frontend/lib/actions.ts"
  - "frontend/lib/actions/**"
  - "frontend/lib/requests/**"
---

# Server Action Rules

- `"use server"` directive at the top of every action file.
- **Server Actions live in BOTH `lib/actions.ts` AND `lib/requests/*.ts`.** Most request files contain GET functions and mutation functions side by side, all under `"use server"`.
- Validate input with Zod schemas from `lib/validations/` where they exist (some simple mutations skip Zod).
- Use raw `fetch()` for mutations (PUT/POST/DELETE), NOT `fetchAPI()`.
- **#1 bug source:** `fetchAPI()` auto-flattens but raw `fetch()` does NOT. Spread `STRAPI_RESPONSE_FORMAT_HEADER` into raw `fetch()` headers (keeps the v4 shape), then call `flattenAttributes()`.
- Build single-entry URLs with `strapiEntryUrl`. Relation values are documentIds (`entity.documentId` or `resolveDocumentIds`). Never trust a `documentId` from the client.
- DELETE returns an empty 204: read it with `readJsonOrNull` (`lib/strapi-response.ts`).
- MUST call `revalidateTag()` with appropriate `CACHE_TAGS` after every mutation.
- Never hardcode cache tag strings — always use `CACHE_TAGS` constants from `lib/cache-tags.ts`.
- Every export must call `requireRole` or `withAuth` (`lib/auth/guards.ts`), or be allowlisted. Enforced by `testing/security/server-action-auth-guard.test.ts`. See `docs/agent/server-action-auth.md`.
