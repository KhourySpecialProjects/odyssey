# Dynamic zone nested populate needs `on:` on v5

Date: 2026-10-06
Author: Jaylen Zeng + Claude (ODY-605)
Status: new

## What we learned

Populating inside a dynamic zone without `on: { "<component>": {...} }` returns 400 `Invalid key populate at blocks`, or silently drops the component.

## Why it matters

A lesson page 400s or renders without its blocks, and the failure looks like a data problem.

## Evidence

- `frontend/lib/requests/lesson-populates.ts` (`LESSON_BLOCKS_POPULATE`)
- `docs/plans/ODY-598.md` (found during T0.5)
