\set ON_ERROR_STOP on
-- expected_db must be passed on the command line; it guards against the wrong database.
\if :{?expected_db}
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-633: pass -v expected_db=<database name>'; END $$;
\endif
SELECT current_database() = :'expected_db' AS db_ok \gset
\if :db_ok
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-633: wrong database for expected_db'; END $$;
\endif
-- ODY-633: decisions below are for the dev dump (local + dev DB). Prod needs its own copy outside the repo.
-- Run: psql -v ON_ERROR_STOP=1 -v expected_db=<db> -f 02-handle-unpublished.sql
BEGIN;

-- (b) keep: hide first. Playlist 53 (DS example) goes private.
UPDATE playlists SET is_public = false WHERE published_at IS NULL AND id IN (53);
-- Droplets/voyages not yet status='draft': demote only by explicit decision.
-- UPDATE droplets SET status = 'draft' WHERE published_at IS NULL AND id IN (NULL);
-- UPDATE voyages  SET status = 'draft' WHERE published_at IS NULL AND id IN (NULL);
-- Lessons linked from a published droplet: unlink or accept.
-- DELETE FROM droplets_lessons_links WHERE lesson_id IN (NULL) AND droplet_id IN (NULL);

-- (b) keep: back-fill so Strapi's disable step keeps the row. Droplets 136-141 and voyage 10 are already status='draft'.
UPDATE droplets          SET published_at = created_at WHERE published_at IS NULL AND id IN (136, 137, 138, 139, 140, 141);
UPDATE lessons           SET published_at = created_at WHERE published_at IS NULL AND id IN (NULL);
UPDATE playlists         SET published_at = created_at WHERE published_at IS NULL AND id IN (53);
UPDATE voyages           SET published_at = created_at WHERE published_at IS NULL AND id IN (10);
UPDATE creation_requests SET published_at = created_at WHERE published_at IS NULL AND id IN (NULL);

-- (a) delete: only rows with zero dependents in 01 section 3a; link rows cascade. Every delete needs a matching guard.
-- Guard for lesson 278: fail if any lesson link table (01 section 3a) references it.
DO $$
DECLARE n bigint;
BEGIN
  SELECT (SELECT count(*) FROM droplets_lessons_links WHERE lesson_id IN (278))
       + (SELECT count(*) FROM droplet_lessons_lesson_links WHERE lesson_id IN (278))
       + (SELECT count(*) FROM enrollments_viewed_lessons_links WHERE lesson_id IN (278))
       + (SELECT count(*) FROM notes_lesson_links WHERE lesson_id IN (278))
       + (SELECT count(*) FROM highlights_lesson_links WHERE lesson_id IN (278))
       + (SELECT count(*) FROM lessons_locked_by_links WHERE lesson_id IN (278))
    INTO n;
  IF n > 0 THEN
    RAISE EXCEPTION 'ODY-633: lesson 278 has % dependent links; keep it instead of deleting', n;
  END IF;
END $$;
DELETE FROM lessons WHERE published_at IS NULL AND id IN (278);

-- Abort (roll back everything) if any id was missed.
DO $$
DECLARE n bigint;
BEGIN
  SELECT (SELECT count(*) FROM droplets WHERE published_at IS NULL)
       + (SELECT count(*) FROM lessons WHERE published_at IS NULL)
       + (SELECT count(*) FROM playlists WHERE published_at IS NULL)
       + (SELECT count(*) FROM voyages WHERE published_at IS NULL)
       + (SELECT count(*) FROM creation_requests WHERE published_at IS NULL)
    INTO n;
  IF n > 0 THEN
    RAISE EXCEPTION 'ODY-633: % rows still have published_at IS NULL; nothing committed', n;
  END IF;
END $$;

COMMIT;
