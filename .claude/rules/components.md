---
paths:
  - "frontend/components/**"
  - "frontend/app/**"
---

# Component Rules

- Server Components by default (no directive needed). Only add `"use client"` for interactivity.
- Don't make a parent `"use client"` just because a child needs it — keep the parent as Server Component.
- Use `cn()` from `lib/utils` for conditional Tailwind classes (clsx + tailwind-merge).
- Use `getCachedX()` wrappers in Server Components for per-request deduplication.
- Use `Promise.all()` for parallel data fetches — never sequential awaits for independent data.
- Tailwind v3.4 ONLY. Never use `@theme` or CSS-first config (v4).
- UI primitives go in `components/ui/`. Feature components go in `components/{domain}/`.
