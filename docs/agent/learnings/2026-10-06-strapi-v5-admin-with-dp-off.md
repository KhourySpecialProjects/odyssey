# Strapi v5 admin quirks on content types with D&P off

Date: 2026-10-06
Author: Jaylen Zeng + Claude (ODY-699 Task 5)
Status: new

## What we learned

On v5, every save of a type with Draft & Publish off sets `published_at` to now, through the admin and REST alike. In the admin list view, sort by `status` is ignored and falls back to id order. Old rows with NULL in a required field (`difficulty` on 50 droplets, `is_sequential` on voyage 1) can't be saved in the admin at all, on v4 too.

## Why it matters

Don't treat `publishedAt` as "first published" (the frontend doesn't read it today). When an admin save fails with "There are validation errors", check for NULL required fields before suspecting the ODY-699 extension.

## Evidence

- `@strapi/core/dist/services/document-service/draft-and-publish.js` `statusToData`: with no D&P it sets `data.publishedAt = new Date()`.
- `GET /content-manager/collection-types/api::droplet.droplet?sort=status:ASC` and `...:DESC` return the same order on `ody597`.
- `SELECT count(*) FROM droplets WHERE difficulty IS NULL` returns 50 on `ody597` and `ody633`. The ticket is [ODY-699](https://linear.app/aiil/issue/ODY-699); the full verification results were not kept.
