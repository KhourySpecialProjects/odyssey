---
paths:
  - "backend/src/api/**"
  - "backend/src/extensions/**"
---

# Strapi Backend Rules

- Document Service (`strapi.documents(uid)`). The Query Engine (`strapi.db.query`) only inside `strapi.db.transaction`. Guard: `backend/tests/no-entity-service.test.js`.
- Hooks are `lifecycles.ts`. Before hooks have no `documentId` yet: `findFirst({ filters: { id } })`. After hooks: `findOne({ documentId })`.
- Bulk `*Many` lifecycle hooks never fire from the Document Service. Document middlewares aren't used here; adding one needs a ticket.
- Draft & Publish is off (`draftAndPublish: false`). `status` on droplet/voyage is a domain enum; never add `status`/`publishedAt` to a D&P type.
- Strict REST rejects unknown input keys with 400. A non-schema input key needs `strapi.contentAPI.addInputParams` (`backend/src/index.ts`).
- Raw SQL uses the v5 join tables: `*_lnk`, `*_cmps`, `files_related_mph`.
- After a `@strapi/*` bump, save one droplet in the admin (ODY-699: the content-manager extension keeps `status` visible).
- Schema files are the source of truth: `backend/src/api/{type}/content-types/{type}/schema.json`
- Check `blocksVersion` on lessons: `v1` = TipTap `blocks`, `v2` = BlockNote `blocksV2`.
- Load the `strapi-v5-patterns` skill for query building guidance.
- See `docs/agent/backend-architecture.md` for the full domain model.
