\set ON_ERROR_STOP on
-- ODY-596 (read-only): what changed since the site reopened, for re-entry after a rollback. Also works on v4 (missing columns are skipped).
-- Run on the failed DB before the swap: psql -d <db> -v t_open='<YYYY-MM-DD HH:MM UTC>' -f writes-since.sql > ~/ody-596/<env>-writes-since-<date>.txt
\if :{?t_open}
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: pass -v t_open=<time the site reopened, UTC>'; END $$;
\endif
SET TIME ZONE 'UTC';
SELECT (:'t_open'::timestamptz AT TIME ZONE 'UTC')::text AS t_cut \gset
\echo '== Changes since' :t_cut 'UTC =='

\echo '== 1. Per table: table|created_since|updated_since (updated_since = updated but not created since t_open; strapi_* tables skipped) =='
\pset format unaligned
\pset tuples_only on
SELECT t.table_name
       || '|' || (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I WHERE created_at >= %L::timestamp', t.table_name, :'t_cut'), false, true, '')))[1]::text
       || '|' || (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I WHERE updated_at >= %L::timestamp AND (created_at < %L::timestamp OR created_at IS NULL)', t.table_name, :'t_cut', :'t_cut'), false, true, '')))[1]::text
  FROM information_schema.tables t
 WHERE t.table_schema = 'public'
   AND t.table_type = 'BASE TABLE'
   AND t.table_name NOT LIKE 'strapi\_%'
   AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'created_at')
   AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'updated_at')
 ORDER BY t.table_name;
\pset format aligned
\pset tuples_only off

\echo '== 2. Content rows created or updated since t_open (one result per table; re-enter these by hand) =='
SELECT format('SELECT %L AS tbl, %s FROM public.%I WHERE created_at >= %L::timestamp OR updated_at >= %L::timestamp ORDER BY updated_at',
              t.tbl,
              (SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY array_position(ARRAY['id', 'document_id', 'slug', 'name', 'group_name', 'status', 'created_at', 'updated_at', 'updated_by_id'], c.column_name::text))
                 FROM information_schema.columns c
                WHERE c.table_schema = 'public' AND c.table_name = t.tbl
                  AND c.column_name IN ('id', 'document_id', 'slug', 'name', 'group_name', 'status', 'created_at', 'updated_at', 'updated_by_id')),
              t.tbl, :'t_cut', :'t_cut')
  FROM unnest(ARRAY['droplets', 'lessons', 'playlists', 'voyages', 'groups', 'files']) AS t(tbl)
 WHERE to_regclass('public.' || t.tbl) IS NOT NULL
\gexec

\echo '== 3. Deletes do not show up here: compare fingerprint.sql section 4 counts of the failed and frozen databases =='
