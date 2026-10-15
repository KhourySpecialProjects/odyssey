---
paths:
  - "frontend/lib/requests/**"
---

# Request Function Rules

- All GET requests go through `fetchAPI()` in `lib/utils.ts`.
- Always specify `next.tags` with `CACHE_TAGS` constants — never hardcode strings.
- Default revalidation: 900 seconds (15 min). Tags: 3600 seconds (1 hour).
- Only populate relations you actually render. Never `populate: "*"`.
- `cache` and `next` fetch options are mutually exclusive in Next.js 15 — passing both silently breaks caching.
- Use populate presets from `enrollment-populates.ts` / `user-populates.ts` when available.
- Read the Strapi schema before writing a new request function: `backend/src/api/{type}/content-types/{type}/schema.json`.
