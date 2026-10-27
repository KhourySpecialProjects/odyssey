# Strapi v5 transactions: what joins, what defers, what aborts

Date: 2026-10-26
Author: Jaylen Zeng + Claude (ODY-800)
Status: new

## What we learned

- Document Service calls join an outer `strapi.db.transaction()`, and `entry.*` events are deferred to the outermost commit (never sent on rollback). Lifecycle hooks run inside the transaction.
- Postgres aborts the whole transaction after any failed statement (25P02), so never catch a DB error inside it and carry on. Annotate and rethrow.
- Uid uniqueness is validated before `beforeCreate`, so a fixed slug placeholder collides once any row stores it. Use a unique one (`publish-<uuid>`).

## Why it matters

A "log and continue" loop that worked over REST leaves a poisoned transaction and a confusing error. The SQLite test DB shows neither the abort nor `forUpdate` locking, so those need a Postgres check.

## Evidence

- `backend/src/lib/publish-edit.ts`, `backend/tests/api/publish-edit.test.js`
- `@strapi/core/dist/services/document-service/{repository,events}.js`, `@strapi/database/dist/index.js`
