# v5 renames join tables, keeps old index names

Date: 2026-10-06
Author: Jaylen Zeng + Claude (ODY-605)
Status: new

## What we learned

The first v5 boot renames `*_links` to `*_lnk`, `*_components` to `*_cmps` and `files_related_morphs` to `files_related_mph`. Index names keep the old names, and the migration is one-way. `scripts/ody-633/01`/`02` use the v4 names on purpose; `03` still does until playbook 2.2.

## Why it matters

Raw SQL written against v4 names fails on v5, and `03` fails if run after the switch.

## Evidence

- `scripts/ody-633/`, for example `03-post-switch-verify.sql` (`enrollments_droplet_links`)
- `docs/playbooks/strapi-prod-migration-day.md` item 2.2
