\set ON_ERROR_STOP on
-- ODY-596 fingerprint (read-only): a diffable snapshot of a Strapi DB, whether v4, v5 or partly migrated.
-- Run: psql -d <db> -f fingerprint.sql > ~/ody-596/<env>-fp-<label>-<date>.txt (output holds real data; keep it out of the repo)
\echo '== 1. Database =='
SELECT current_database() AS db, version() AS version, pg_size_pretty(pg_database_size(current_database())) AS size, now() AS taken_at;

\echo '== 2. Flavor (v4: no document_id, no *_lnk tables, no v5 migrations; v5: document_id and only *_lnk tables; anything else is PARTIAL) =='
WITH f AS (
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'droplets' AND column_name = 'document_id') AS has_document_id,
         CASE WHEN to_regclass('public.strapi_migrations_internal') IS NULL THEN 0
              ELSE (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM public.strapi_migrations_internal WHERE name LIKE ''5.0.0-%''', false, true, '')))[1]::text::int
         END AS v5_migrations,
         (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%\_lnk') AS lnk_tables,
         (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%\_links') AS links_tables
)
SELECT *,
       CASE WHEN NOT has_document_id AND lnk_tables = 0 AND v5_migrations = 0 THEN 'v4'
            WHEN has_document_id AND lnk_tables > 0 AND links_tables = 0 THEN 'v5'
            ELSE 'PARTIAL'
       END AS flavor
  FROM f;

\echo '== 3. Database metadata (TEMPLATE copies do not copy datacl or per-database settings; compare with the T0 fingerprint) =='
SELECT pg_get_userbyid(d.datdba) AS owner, d.datacl, pg_encoding_to_char(d.encoding) AS encoding, d.datcollate, d.datctype, d.datconnlimit
  FROM pg_database d
 WHERE d.datname = current_database();
SELECT CASE WHEN s.setrole = 0 THEN '(all roles)' ELSE pg_get_userbyid(s.setrole) END AS role, s.setconfig
  FROM pg_db_role_setting s
  JOIN pg_database d ON d.oid = s.setdatabase
 WHERE d.datname = current_database()
 ORDER BY 1;

\echo '== 4. Tables: table|row_count|max_updated_at (diff this section between two runs) =='
\pset format unaligned
\pset tuples_only on
SELECT t.tablename
       || '|' || (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.tablename), false, true, '')))[1]::text
       || '|' || CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.tablename AND c.column_name = 'updated_at')
                      THEN coalesce((xpath('/row/m/text()', query_to_xml(format('SELECT max(updated_at) AS m FROM public.%I', t.tablename), false, true, '')))[1]::text, '')
                      ELSE ''
                 END
  FROM pg_tables t
 WHERE t.schemaname = 'public'
 ORDER BY t.tablename;
