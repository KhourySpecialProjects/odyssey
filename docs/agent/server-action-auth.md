# Server Action Auth

## Every export is an endpoint

Every exported function in a `"use server"` file is a public POST endpoint. Anyone with a session — or anyone at all, for role-less checks — can call it directly with arbitrary arguments, bypassing any page or layout gate. Every export needs its own check.

## Pick your guard

- **`withAuth`** (`lib/auth/guards.ts`) — for actions shaped `{ ok, error, data }`. Runs `requireRole` and only calls the handler on success.

  ```ts
  export async function togglePresentationEnabled(
    dropletId: number,
    enabled: boolean,
  ) {
    return withAuth([], async (user) => {
      const droplet = await getDropletById(dropletId, {
        fields: ["id"],
        populate: { authorized_users: { fields: ["id"] } },
      });
      const owner = assertOwner(
        droplet?.authorized_users?.map((u) => u.id),
        user,
      );
      if (!owner.ok) return { ok: false, error: owner.error, data: null };
      return updateDroplet(dropletId, { presentationEnabled: enabled });
    });
  }
  ```

- **Otherwise, call `requireRole` directly** and map `gate.error` yourself.

  ```ts
  export async function setDropletHidden(dropletId: number, hidden: boolean) {
    const gate = await requireRole([]);
    if (!gate.ok) return { success: false, error: gate.error };
    // ...
  }
  ```

- **`assertOwner`** — for record ownership. `bypassRoles` defaults to `[SysAdmin]` only; pass `[]` for no bypass at all. It returns a result and never throws.
- **Never re-export `withAuth` from a `"use server"` file** — the re-export itself becomes a public action.
- **Constants in a `"use server"` file must not be exported** (e.g. `CLAIM_BYPASS_ROLES` in `voyage-enrollment.ts`) — the guard test only allows exported function declarations.

## Caller identity

- The caller's id always comes from `gate.user.id`, never from a client-supplied argument.
- A client-supplied user id is a _target_, not the caller — check it with `assertOwner`, as `claimNodeForUser` does:

  ```ts
  const self = assertOwner(userId, user, { bypassRoles: CLAIM_BYPASS_ROLES });
  if (!self.ok) return { ok: false, error: self.error, data: null };
  ```

- `getAuthorizedUserId` (`lib/auth/current-user-id.ts`) is for Server _Components_, not Server Actions (ODY-555).

## Error codes

Always `"unauthenticated"` or `"forbidden"`. No caller reads the error text.

## Roles come from Strapi, and the dev persona override

- `requireRole` reads roles from Strapi (via `getCachedUser`, cached up to 900s), not the JWT — a role revoked in Strapi takes effect without re-login.
- Locally, with `ENABLE_DEV_ROLE_OVERRIDE=true` in `.env.local` _and_ `NODE_ENV=development`, the `dev-role-override` cookie raises or lowers the caller's roles for pages and actions alike. `id` and `email` are never overridden. It can't activate in a `next build`/`next start` image — `NODE_ENV` is always `production` there.

## Testing

Reference: `testing/requests/droplet-auth.test.ts` (`togglePresentationEnabled`, `setDropletHidden`), using `testing/helpers/server-action-auth.ts`'s `describeServerActionAuth`:

- `denial: { kind: "role", roles }` for a plain role gate, or `{ kind: "owner", nonOwner, roles? }` for ownership (`roles` defaults to `[]`).
- `mutations: () => [...]` is structural (`{ mock: { calls } }`) — `global.fetch` and `jest.mocked(revalidateTag)` both work with no cast.
- `arrange`/`expect`/`expectDenied` may be async — the helper awaits every one of them.
- In `arrange`, use `mockResolvedValue`, not `...Once` — `jest.clearAllMocks()` doesn't drain queued `...Once` values between the generated `it`s.
- When an action nests a second gate call (e.g. `claimVoyageDropletNode` → `claimNodeForUser`), the helper asserts required roles with `toHaveBeenNthCalledWith(1, ...)`, not `toHaveBeenCalledWith`.

## The guard test and allowlist

`testing/security/server-action-auth-guard.test.ts` scans every `"use server"` file under `lib/` and `app/`. It fails when:

- (a) an export is unguarded and not allowlisted;
- (b) a key is in both `PUBLIC_ACTIONS` and `PENDING_AUTH`;
- (c) a `PUBLIC_ACTIONS` reason is empty;
- (d) an entry is stale — the function no longer exists, or it's guarded but still in `PENDING_AUTH`.

Only exported function declarations are supported. `export const`, `export { … }`, `export default <expr>`, and re-exports fail as unsupported forms; type/interface exports are ignored.

**Using it:**

- Converting a function to `requireRole`/`withAuth`: delete its `PENDING_AUTH` entry, or CI fails it as stale.
- Adding a genuinely public action: add a `PUBLIC_ACTIONS` entry with a reason a reviewer can check.
- New code must never add a `PENDING_AUTH` entry — that list only shrinks.

**Known limits:**

- It only checks that a guard call exists — not that the result is honored, that the roles are right, or that ownership is actually checked.
- Calling a guarded helper doesn't count as guarded; the call must be in the export's own body (a nested closure counts, even if never called).
- Inline `"use server"` closures inside Server Components aren't scanned (e.g. `app/(editing)/draft/d/[slug]/page.tsx`) — ODY-504 audits those by hand.
- Route Handlers aren't covered (e.g. `app/api/user-activity/[userId]/route.ts`, which checks `getServerSession` directly) — ODY-509 should audit it.

## Known gaps

- `withAuth` doesn't catch handler errors — a Strapi failure inside the handler rejects the whole action (e.g. `togglePresentationEnabled`, `claimNodeForUser`).
- Ownership data can be stale: `getDropletById` (used by `togglePresentationEnabled`/`setDropletHidden`) caches for up to 900s; the voyage/node lookups (`archiveVoyage`, `claimNodeForUser`, `unclaimVoyageDropletNode`) always refetch.
- `approveCreationRequest` ignores the `{ ok: false }` `claimNodeForUser` can return (ODY-510).
- Rate-limit tiers still read session roles directly, not `requireRole` (ODY-504/510).
