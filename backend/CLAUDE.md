# Backend Conventions (Strapi 4.22)

Inherits root `CLAUDE.md`. Only Strapi-specific patterns below.

## CRITICAL: Strapi v4, NOT v5

Entity Service API, numeric `id`, nested `{ data: { attributes: {} } }` responses. NEVER use Document Service API, `documentId`, or flat responses. If you find v5 docs online, they will NOT work here.

## Schema Is Source of Truth

Always read `backend/src/api/{type}/content-types/{type}/schema.json` before modifying any content type. The schema defines every field, relation, enum, and constraint. See `docs/agent/backend-architecture.md` for the full domain model.

## Lesson Content Format

Lessons have two block formats. Check `blocksVersion`: if `v2`, read `blocksV2` (BlockNote JSON). If `v1` or absent, read `blocks` (TipTap dynamic zone). Never assume one format — always check.
