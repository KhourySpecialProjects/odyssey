---
name: react-patterns
description: Next.js 15 App Router component patterns specific to Odyssey. Use when building routes, pages, layouts, Server/Client Components, or deciding component boundaries. Covers Suspense, error boundaries, data fetching in components, route structure, auth, and Odyssey's component organization.
invocation: auto
---

# React & Next.js 15 Patterns for Odyssey

## This Is Next.js 15

Odyssey uses Next.js 15 with App Router. Key differences from 14:

- `params` and `searchParams` are Promises — always `await` them
- `cache` and `next` on fetch are mutually exclusive — passing both silently breaks
- Server Components are the default — no directive needed

## Route Structure

```
app/
├── (general)/       Dashboard, explore, feed, admin, settings, friends
├── (droplets)/      /d/[slug] — droplet viewing
├── (playlists)/     /p/[slug] — playlist viewing
├── (creation)/      /new/ — content creation
├── (editing)/       /draft/ — draft editing
├── (groups)/        /g/[slug] — group pages
└── api/auth/[...nextauth]/  — NextAuth (only API route)
```

Route groups (parenthesized) share layouts without affecting URL paths.

## Server vs. Client Component Decision Tree

```
Does this component need...
├── useState, useEffect, useRef, event handlers, Zustand?
│   └── YES → "use client" (Client Component)
├── fetchAPI() or direct data fetching?
│   └── YES → Server Component (default, no directive)
├── Browser APIs (window, document, localStorage)?
│   └── YES → "use client"
├── Only rendering props/children with Tailwind?
│   └── YES → Server Component (default)
└── Mixed? (parent fetches, child is interactive)
    └── Keep parent as Server Component, wrap child as Client Component
```

## Component Boundaries

**The #1 mistake:** Making a parent component `"use client"` because a child needs interactivity.

```tsx
// BAD — entire tree becomes client, loses SSR data fetching
"use client";
export default function DropletPage({ params }) {
  const [isOpen, setIsOpen] = useState(false);
  const droplet = useDroplet(params.slug); // now needs client-side fetch
  return <div>...</div>;
}

// GOOD — server parent, client child
export default async function DropletPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // Next.js 15: params is a Promise
  const droplet = await getDropletBySlug(slug); // server fetch

  if (!droplet) notFound();

  return (
    <div>
      <DropletHeader droplet={droplet} />
      <InteractivePanel defaultOpen={false} /> {/* "use client" */}
    </div>
  );
}
```

**Client Component with `useTransition`:**

```tsx
// components/droplets/complete-button.tsx
"use client";

import { useState, useTransition } from "react";
import { completeLesson } from "@/lib/actions";

export function CompleteButton({ enrollmentId, lessonId, userId }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(() => completeLesson(enrollmentId, lessonId, userId))
      }
    >
      {isPending ? "Completing..." : "Mark Complete"}
    </button>
  );
}
```

## Data Fetching in Server Components

```tsx
// Page-level fetch — the standard pattern
export default async function ExplorePage() {
  const droplets = await getPublishedDroplets();
  return <DropletGrid droplets={droplets} />;
}

// Multiple parallel fetches
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session.user.strapiUserId;

  const [enrollments, userSocial, groups] = await Promise.all([
    getCachedEnrollmentsDashboard(userId),
    getCachedUserSocial(session.user.email),
    getCachedUserGroups(userId),
  ]);

  return (/* ... */);
}
```

**Rules:**

- Use `getCachedX()` wrappers (from `lib/requests/cached.ts`) in Server Components for deduplication
- Use `Promise.all()` for parallel fetches — never sequential awaits for independent data
- Never call `getCachedX()` in Server Actions — `cache()` only works in renders

## Suspense Boundaries

Wrap slow data fetches in Suspense so the page shell loads instantly:

```tsx
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <div>
      <DashboardHeader /> {/* renders immediately */}
      <Suspense fallback={<EnrollmentsSkeleton />}>
        <EnrollmentList /> {/* async Server Component */}
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <RecentFeed /> {/* async Server Component */}
      </Suspense>
    </div>
  );
}
```

**When to use Suspense:**

- Data fetch takes >200ms (enrollments, droplet lists, analytics)
- Component is below the fold
- Multiple independent data sources on one page

**When NOT to use Suspense:**

- Single fast fetch that's critical to the page (e.g., droplet detail — user expects it immediately)
- Component is above the fold and the data is cached (loads fast anyway)

## Error Handling

Next.js App Router uses `error.tsx` convention for error boundaries:

```tsx
// app/(general)/dashboard/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div role="alert">
      <p>Something went wrong loading this section.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

Place `error.tsx` in any route directory to catch errors from that route's `page.tsx` and children.

## Conditional Tailwind Classes

Always use `cn()` (clsx + tailwind-merge) for conditional classes:

```tsx
import { cn } from "@/lib/utils";

<div
  className={cn(
    "rounded-lg border p-4",
    isActive && "border-blue-500 bg-blue-50",
    isDisabled && "cursor-not-allowed opacity-50",
  )}
/>;
```

## Component File Organization

```
components/
├── {domain}/           Feature-specific components
│   ├── component.tsx   The component itself
│   └── index.ts        Re-export (optional, only if imported from multiple places)
├── shared/             Cross-cutting components (header, footer, modals)
└── ui/                 Design system primitives (buttons, inputs, cards)
```

- New UI primitives → `components/ui/`
- Feature components → `components/{domain}/` matching the route group
- Shared layout → `components/shared/`

## Form Patterns

Forms use Server Actions with Zod validation:

```tsx
// Client Component — handles form state and submission
"use client";
import { useActionState } from "react";

export function CreateDropletForm() {
  const [state, formAction] = useActionState(createDroplet, initialState);

  return (
    <form action={formAction}>
      {state?.error && <p className="text-red-500">{state.error}</p>}
      <input name="name" />
      <button type="submit">Create</button>
    </form>
  );
}

// Server Action (lib/actions.ts) — validates and mutates
export async function createDroplet(prevState, formData) {
  const parsed = dropletSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.message };
  // ... Strapi mutation, revalidateTag(), return/redirect
}
```

**Note:** `useActionState` (React 19 / Next.js 15) replaces the deprecated `useFormState`.

## Zustand Store Pattern

For client-side state that doesn't belong in URL params. Stores live in `frontend/stores/`:

```tsx
// stores/debug-toggle-store.ts
import { create } from "zustand";

interface DebugToggleStore {
  isDebugMode: boolean;
  toggle: () => void;
}

export const useDebugToggleStore = create<DebugToggleStore>((set) => ({
  isDebugMode: false,
  toggle: () => set((state) => ({ isDebugMode: !state.isDebugMode })),
}));
```

**When Zustand vs. URL params (`nuqs`):**

- Zustand: ephemeral UI state (current lesson, sidebar open, modal state, debug toggle)
- nuqs/URL params: shareable state (search query, filter selections, sort order)

## Auth

NextAuth with Azure AD + GitHub OAuth. Session checked via `getCurrentUser()`. Middleware protects `/admin/*` (System Admin only) and `/d/*` (any authenticated user). Roles defined in `lib/globals.ts`.

## Styling

Tailwind v3.4 with `tailwind.config.ts`. Use `cn()` for conditional classes. Radix UI for accessible primitives. Lucide React for icons. NEVER use Tailwind v4 syntax (`@theme`, CSS-first config).

## Loading and Error States

```
app/(droplets)/d/[slug]/
├── page.tsx       — route content
├── loading.tsx    — shown while page loads (Suspense boundary)
└── error.tsx      — shown on error (Error boundary, must be "use client")
```

Use `<Suspense fallback={...}>` for streaming slow data within a page. Wrap slow Server Components individually rather than making the whole page wait.
