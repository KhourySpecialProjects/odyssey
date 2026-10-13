# Frontend Architecture

## Route Groups and URL Structure

The frontend uses Next.js 15 App Router with route groups that organize pages by domain:

```
app/
├── (general)/          Dashboard, explore, feed, admin, settings, friends
│   ├── admin/          Admin panel (protected by middleware, System Admin only)
│   ├── dashboard/      User's enrolled droplets, progress, due dates
│   ├── explore/        Browse/search all published droplets and playlists
│   ├── feed/           Announcements (friend, system, group, kudos, etc.)
│   ├── settings/       User preferences, privacy, time zone
│   └── friends/        Friend list, requests, blocked users
├── (droplets)/         Droplet viewing — /d/[slug]
│   └── d/[slug]/       Individual droplet with lessons, notes, highlights
├── (playlists)/        Playlist viewing — /p/[slug]
│   └── p/[slug]/       Curated droplet collections
├── (creation)/         Content creation — /new/
│   └── new/            Create droplet, playlist, or group
├── (editing)/          Draft editing — /draft/
│   └── draft/          Edit unpublished content
├── (groups)/           Group pages — /g/[slug]
│   └── g/[slug]/       Study groups with members, assigned content, due dates
└── api/
    ├── auth/[...nextauth]/   NextAuth route handler
    └── user-activity/        Activity tracking endpoint
```

Route groups (parenthesized names) share layouts without affecting the URL path. Each group can have its own `layout.tsx` with group-specific chrome (navigation, sidebars).

## Component Organization

```
components/
├── admin/        Admin panel: user management, content moderation, analytics
├── dashboard/    Dashboard tiles, progress bars, enrollment cards
├── droplets/     Droplet display: lesson viewer, completion tracking, rating
├── explore/      Search bar, filter sidebar, droplet/playlist grid
├── feed/         Announcement cards by type, feed layout
├── new/          Creation forms: droplet wizard, playlist builder, group setup
├── playlists/    Playlist cards, enrollment flow, droplet ordering
├── shared/       Cross-cutting: header, footer, sidebar, modals, toasts
└── ui/           38+ reusable primitives (buttons, inputs, cards, dialogs, etc.)
```

The `ui/` directory contains design system primitives. Many are Radix UI-based with Tailwind styling. New UI components go here; feature-specific components go in their domain directory.

## Key Libraries and Their Roles

**UI Layer:**

- **Radix UI** — Accessible, unstyled component primitives (dialogs, dropdowns, tabs, etc.)
- **Mantine** — Used selectively for specific components (not the primary UI library)
- **Tailwind v3.4** — All styling. Config in `tailwind.config.ts`. Use `cn()` for conditional classes.
- **Lucide React** — Icon library

**Rich Text / Content Editing:**

- **TipTap** — Rich text editor for lesson content (v1 `blocks` JSON format)
- **BlockNote** — Block editor for newer lesson content (`blocksV2` JSON format)
- Lessons store content in one of two formats. Check `lesson.blocksV2` first (BlockNote JSON), fall back to `lesson.blocks` (TipTap JSON). The `strapiJSONToTiptapJSON()` and `tiptapJSONToStrapiJSON()` converters in `lib/utils.ts` handle the TipTap format.

**State Management:**

- **Zustand** — Client-side state (stores in `frontend/stores/`)
- **nuqs** — URL search params as state (used in explore page for filters/sorting)
- **React `cache()`** — Per-request deduplication for server components (see `lib/requests/cached.ts`)

**Validation:**

- **Zod** — Schema validation for all form data. Schemas in `lib/validations/`. Every Server Action validates input with Zod before calling Strapi.

**Analytics:**

- **PostHog** — Event tracking and feature flags. Client initialized in providers.

**Fonts:**

- **Lato** — Primary font loaded via Google Fonts in the root layout.

## Auth Flow

Authentication uses NextAuth with two providers: Azure AD (Northeastern SSO) and GitHub OAuth.

1. User clicks sign in → redirected to Azure AD or GitHub
2. `signIn` callback (`lib/auth/options.ts`) checks the user's email exists in the `authorized-users` Strapi collection. If not found, sign-in is rejected.
3. `jwt` callback fetches the user's roles from Strapi and their NUID from Microsoft Graph API (Azure AD users only). These are embedded in the JWT.
4. `session` callback populates the NextAuth session object with roles, user ID, NUID, and profile data from the JWT.
5. Middleware (`frontend/middleware.ts`) runs on every request and protects routes: `/admin/*` requires System Admin role, `/d/*` requires any authenticated user.

**Role hierarchy** (defined in `lib/globals.ts`):

- `System Admin` — Full platform access, user management, content moderation
- `Content Creator` — Can create and publish droplets
- `Content Editor` — Can edit existing published content
- `Faculty` — Can view analytics, manage groups, assign due dates
- `User` — Default role, can browse and enroll in content

Admin check: `isAuthorizedUserAdmin(roles)` returns true only for `System Admin`. Checked via `AuthorizedUserAdminRoles` array in `lib/globals.ts`.

## Server Components vs. Client Components

Next.js 15 defaults to Server Components. Follow these rules:

**Server Components** (default — no directive needed):

- Data fetching with `fetchAPI()`
- Pages and layouts that render Strapi data
- Any component that doesn't need browser APIs, event handlers, or React hooks

**Client Components** (add `"use client"` at file top):

- Interactive UI: forms, buttons with click handlers, dropdowns
- Components using `useState`, `useEffect`, `useRef`, Zustand stores
- Components using browser APIs (`window`, `document`, `localStorage`)

**Common mistake:** Making a component `"use client"` just because a child needs interactivity. Instead, keep the parent as a Server Component and wrap only the interactive child in a Client Component. This preserves server-side data fetching in the parent.

## Server Actions

All mutations go through Server Actions in `lib/actions.ts` (which has `"use server"` at the top).

Pattern for every action:

1. Validate input with Zod
2. Call Strapi via raw `fetch()` (not `fetchAPI()` — actions use PUT/POST/DELETE which need response handling)
3. Call `flattenAttributes()` on the raw response (required because raw `fetch()` doesn't auto-flatten like `fetchAPI()` does)
4. Call `revalidateTag()` with the appropriate `CACHE_TAGS` constant to bust the cache
5. Return a result object or redirect

**Critical:** Server Actions that use raw `fetch()` MUST call `flattenAttributes()` manually. `fetchAPI()` auto-flattens, but raw `fetch()` does not. This is a frequent source of bugs.

## Static Assets and Media

- Static assets (logos, icons, default images) live in `frontend/public/`
- User-uploaded media (profile photos, lesson images) stored in AWS S3
- S3 upload handled by `uploadImage()` Server Action in `lib/actions.ts`
- CDN URL configured via `AWS_CDN_URL` env variable
- Image paths in Strapi responses use the CDN URL prefix
