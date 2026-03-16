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
- MUST call `flattenAttributes()` manually on raw `fetch()` responses — `fetchAPI()` auto-flattens but raw `fetch()` does NOT.
- MUST call `revalidateTag()` with appropriate `CACHE_TAGS` after every mutation.
- Never hardcode cache tag strings — always use `CACHE_TAGS` constants from `lib/cache-tags.ts`.
