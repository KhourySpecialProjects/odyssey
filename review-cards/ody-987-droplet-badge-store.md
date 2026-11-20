title: Badges get a store: one picked badge per droplet, with its 3 options (ODY-987)
risk: 🔴 needs review
kind: feature
---

Adds a `droplet-badge` collection and four service-token-only routes that keep each droplet's picked badge (title, SVG emblem, model) and up to 3 options until the creator picks one; no UI, first PR of Badges (ODY-986).

**Branch:** `claude/ody-987-droplet-badge-store` (commit `f21e940d`)
**Base:** `develop`

## Test on dev

Set `API=<strapi url>/api`, `T=<STRAPI_ACCESS_TOKEN>`, and pick a droplet id `D` and a user id `U`.

1. Save 3 options:
   ```
   curl -s -X POST $API/droplet-badges/options -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
     -d '{"dropletId":D,"userId":U,"options":[{"title":"One","emblemSvg":"<svg><circle r=\"1\"/></svg>","model":"m","promptVersion":"v1"},{"title":"Two","emblemSvg":"<svg><circle r=\"2\"/></svg>"},{"title":"Three","emblemSvg":"<svg><circle r=\"3\"/></svg>"}]}'
   ```
   Expect 200 and 3 `{ id, documentId, title, emblemSvg }`.
2. See them: `curl -s "$API/droplet-badges/options?dropletId=D" -H "Authorization: Bearer $T"` returns the same 3. Saving again replaces them.
3. Pick one: `curl -s -X POST $API/droplet-badges/pick -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"dropletId":D,"optionId":<id>,"userId":U}'`. Then `options?dropletId=D` is `[]`, and `picked?dropletIds=D` returns only the pick. Picking again, or saving options, answers 409.
4. Duplicate SVG: on a second droplet `D2`, save an option with `<svg><circle r="2"/></svg>` (the same design, even re-spaced or with comments): expect 409. If step 3 left only the picked design, use its SVG.
5. Delete the droplet (Strapi admin, or the app's delete): its rows are gone, and the same SVG can now be saved on `D2`.
6. No token: `curl -i $API/droplet-badges/picked?dropletIds=1` answers 401.

## Security

- **Token-only routes.** All four routes set `config.auth.strategies: ['content-api-token']` (as `GET /co-completions` does), so a Public or Authenticated role grant, or a user JWT, can't open them; only an API token passes (the shared `STRAPI_ACCESS_TOKEN`). There is no core router file, so the core REST endpoints don't exist (404/405, tested). mentor-feedback relies on having no role grant; this pins it in code too.
- **Strict bodies.** `parseBody`, `isRowId`, `isText`: an extra key (also inside an option), a bad id, 0 or 4 options, a title over 60, model/promptVersion over 40, or an SVG over 12,288 characters or not starting `<svg` and ending `</svg>` once trimmed is a 400. Query strings are strict too (1-100 ids, no extra keys).
- **Unique emblem.** `emblemHash` is the server's sha256 of the normalized SVG (prolog and comments stripped, `>\s+<` collapsed, trimmed), behind the real unique index `droplet_badges_emblem_hash_uq`. A pre-check gives 409, and a unique violation from a racing save is mapped to 409. Near-identical designs aren't checked. The SVG is not sanitized here (ODY-989).
- **Frontend module** `frontend/lib/requests/droplet-badge.ts` starts with `import "server-only"` and is not a `"use server"` file, so the browser can't call it (an exported server action would be a public endpoint trusting its ids). Callers (989-992) must do their own auth and ownership checks. Logs hold status codes only.
- **Concurrency.** Save and pick lock the droplet row (`forUpdate`) inside one transaction; pick retries once on a concurrent-write error.
- `userId` is trusted from the Next.js server, like the other custom routes. Pick only validates it.

## Schema

- New collection `api::droplet-badge.droplet-badge` (`droplet_badges`, `draftAndPublish: false`): `droplet` (manyToOne, required), `status` (`option` | `picked`), `title` (max 60), `emblemSvg` (text), `emblemHash` (unique), `model`, `promptVersion`, and the creator. Unique index `droplet_badges_emblem_hash_uq` on `emblem_hash`.
- **The creator field is `createdByUser`, not `createdBy`**: Strapi reserves `createdBy` for an admin user, and a relation to authorized-user under that name failed on save. Same reason other schemas use `ranBy` / `dismissedBy`.
- The migration adds one table (plus its two link tables, `droplet_badges_droplet_lnk` and `droplet_badges_created_by_user_lnk`). No existing table changes. Types regenerated.
- **Cascade.** The droplet's `beforeDelete` lifecycle removes its badges with `strapi.db.query(...).deleteMany`. A Document Service `delete` calls `strapi.db.query(uid).delete({ where: { id } })` (read in `@strapi/core` `entries.js`), which runs `beforeDelete` with the numeric row id, so no document middleware is needed. It also handles a documentId `where`. Bulk `beforeDeleteMany` isn't covered (the same gap as the other droplet hooks).
- After a pick nothing changes; a System Admin resets by hand in the Strapi admin. No reset route.

## Overlaps

- **ODY-989 (Jaylen)** uses `saveBadgeOptions` / `getBadgeOptions` / `pickBadge` next.
- **ODY-990 (Brady) and ODY-991 (Awad)** read `getPickedBadges`.
- `frontend/lib/cache-tags.ts`: new `CACHE_TAGS.dropletBadge(id)` and `CACHE_TAGS.dropletBadges`. The write functions flush `dropletBadge(id)` themselves.
- `droplet` lifecycles file gets a `beforeDelete`; `backend-architecture.md` has a new section.

**Suggested reviewer:** `JaylenZeng`

## Checklist

- [x] My code follows the code style of this project.
- [ ] I have moved the ticket to "In Review"
- [ ] I have added reviewers to this PR
- [x] I have updated the documentation accordingly.
- [x] I have added tests to cover my changes.
- [x] All new and existing tests passed.
- [x] Every new/changed export in a `"use server"` file calls `requireRole`/`withAuth`, or is listed in the auth allowlist with a reason. (No `"use server"` file changed.)
