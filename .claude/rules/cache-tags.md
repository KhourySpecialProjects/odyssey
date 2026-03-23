---
paths:
  - "frontend/lib/cache-tags.ts"
---

# Cache Tag Rules

- Global tags: shared across all users (e.g., `CACHE_TAGS.droplets`).
- Per-user tags: scoped via function (e.g., `CACHE_TAGS.enrollments(userId)`).
- When adding a new tag: (1) add constant here, (2) use in request function, (3) add `revalidateTag()` in every action that mutates this data.
- Never hardcode tag strings anywhere — always reference this file's constants.
