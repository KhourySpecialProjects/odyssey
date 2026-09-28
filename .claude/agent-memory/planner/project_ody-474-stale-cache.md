---
name: ody-474-stale-cache
description: ODY-474 — Strapi-admin edits don't invalidate the Next.js data cache; groups stay stale for 900s. Two distinct defects.
metadata:
  type: project
---

ODY-474 ("[Bug] Groups not being removed from Groups page when deleting from admin", Urgent) decomposes into two independent defects that are easy to conflate:

- **Defect A (architectural, the real one):** Odyssey has NO invalidation path from the Strapi admin into the Next.js data cache. Only Odyssey's own Server Actions call `revalidateTag()`. Anything edited in the Strapi Content Manager stays stale until the 900s TTL expires. This is platform-wide, not groups-specific.
- **Defect B (local, sibling):** `getUserGroups` / `getManagedGroups` hardcode `pageSize: 25`, and that budget is consumed across all four roles at once (one `$or` query, bucketed client-side), so a user in 40 groups sees a truncated list. Strapi's own `maxLimit` is 1000 — the cap is ours.

**Why:** The ticket's title only describes the visible symptom (deleted groups still showing). The user explicitly reframed the scope as "resolve the stale lifecycles — any changes to the data should invoke an immediate refresh," i.e. Defect A is the priority and groups is just the first content type.

**How to apply:** When planning or reviewing anything in this area, treat the revalidation mechanism as a generalizable platform primitive (Strapi lifecycle/webhook → frontend revalidate endpoint → `CACHE_TAGS`), not a groups patch. Note that the group↔user relation is editable from the `authorized-user` side too, so a `group`-only hook is insufficient. See [[odyssey-env-and-infra-off-limits]].
