# Frontend Conventions (Next.js 15)

Inherits root `CLAUDE.md`. Only frontend-specific patterns below.

## Server vs Client Components

Default: Server Component (no directive). Use `"use client"` ONLY for event handlers, hooks, browser APIs, or Zustand stores. Keep the parent as Server Component and wrap only the interactive child — do not bubble `"use client"` up unnecessarily.

## Server Actions (mutations)

Live in BOTH `lib/actions.ts` AND `lib/requests/*.ts`. Most request files have `"use server"` and contain GET functions alongside mutation functions. Every mutation follows: raw `fetch()` to Strapi → `flattenAttributes()` on response → `revalidateTag()` → return/redirect. Zod validation applies where schemas exist in `lib/validations/`.

IMPORTANT: `fetchAPI()` auto-flattens. Raw `fetch()` does NOT. This is the #1 source of bugs in this codebase.

## Testing Mocks

Mock `fetchAPI` for request function tests. Mock `@/lib/actions` for component tests. Mock `next/navigation` for routing tests. Mock `next-auth/react` for auth tests. Reusable mock data in `testing/mocks/`. Run specific files during dev: `npx jest path/to/test.ts`.
