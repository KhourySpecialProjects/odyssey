---
paths:
  - "backend/src/api/**"
  - "backend/src/extensions/**"
---

# Strapi Backend Rules

- This is Strapi v4.22. Entity Service API ONLY. Never use Document Service API (v5).
- Numeric `id` fields. Never use `documentId`.
- Nested response format: `{ data: { attributes: {} } }`. Never flat responses.
- Schema files are the source of truth: `backend/src/api/{type}/content-types/{type}/schema.json`
- Check `blocksVersion` on lessons: `v1` = TipTap `blocks`, `v2` = BlockNote `blocksV2`.
- Load the `strapi-v4-patterns` skill for query building guidance.
