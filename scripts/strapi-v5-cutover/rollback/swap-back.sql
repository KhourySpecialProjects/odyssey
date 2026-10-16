\set ON_ERROR_STOP on
-- ODY-596 rollback: rename <live> to <failed> and <frozen> to <live> in one transaction. Backend and frontend must be at 0.
-- Run while connected to postgres: psql -d postgres -v live=<db> -v frozen=<db>_v4_frozen -v failed=<db>_v5_failed -f swap-back.sql
\if :{?live}
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: pass -v live=<database name>'; END $$;
\endif
\if :{?frozen}
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: pass -v frozen=<frozen copy name>'; END $$;
\endif
\if :{?failed}
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: pass -v failed=<name for the failed database>'; END $$;
\endif

SELECT current_database() NOT IN (:'live', :'frozen', :'failed') AS ok_db,
       :'live' <> :'frozen' AND :'live' <> :'failed' AND :'frozen' <> :'failed' AS ok_names,
       EXISTS (SELECT 1 FROM pg_database WHERE datname = :'live') AS live_exists,
       EXISTS (SELECT 1 FROM pg_database WHERE datname = :'frozen') AS frozen_exists,
       NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'failed') AS failed_free,
       (SELECT count(*) FROM pg_stat_activity WHERE datname IN (:'live', :'frozen') AND pid <> pg_backend_pid()) = 0 AS idle,
       (SELECT rolsuper OR rolcreatedb FROM pg_roles WHERE rolname = current_user) AS can_rename
\gset
\if :ok_db
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: connect to the postgres database, not to live, frozen or failed'; END $$;
\endif
\if :ok_names
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: live, frozen and failed must be three different names'; END $$;
\endif
\if :live_exists
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: live database does not exist'; END $$;
\endif
\if :frozen_exists
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: frozen database does not exist; use Path C (restore from the dump)'; END $$;
\endif
\if :failed_free
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: failed database name is already taken; pick another; nothing was changed'; END $$;
\endif
\if :idle
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: sessions are still connected to live or frozen; check both services are at 0, then close them'; END $$;
\endif
\if :can_rename
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: the current role needs CREATEDB'; END $$;
\endif

SELECT pg_get_userbyid(datdba) AS live_owner FROM pg_database WHERE datname = :'live' \gset
SELECT pg_has_role(current_user, :'live_owner', 'MEMBER')
       AND pg_has_role(current_user, (SELECT datdba FROM pg_database WHERE datname = :'frozen'), 'MEMBER') AS owner_ok \gset
\if :owner_ok
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: the current role must be a member of the owner roles of live and frozen'; END $$;
\endif

\timing on
BEGIN;
ALTER DATABASE :"live" RENAME TO :"failed";
ALTER DATABASE :"frozen" RENAME TO :"live";
COMMIT;
\timing off

SELECT pg_get_userbyid(datdba) <> :'live_owner' AS owner_differs FROM pg_database WHERE datname = :'live' \gset
\if :owner_differs
  ALTER DATABASE :"live" OWNER TO :"live_owner";
\endif

\echo '== Live (was frozen) vs failed (was live): owner, datacl and settings must match; re-apply any difference by hand =='
SELECT d.datname, pg_get_userbyid(d.datdba) AS owner, d.datacl,
       (SELECT string_agg(array_to_string(s.setconfig, ', '), '; ') FROM pg_db_role_setting s WHERE s.setdatabase = d.oid AND s.setrole = 0) AS db_settings,
       (SELECT count(*) FROM pg_db_role_setting s WHERE s.setdatabase = d.oid AND s.setrole <> 0) AS role_settings
  FROM pg_database d
 WHERE d.datname IN (:'live', :'failed')
 ORDER BY d.datname = :'failed';
SELECT (SELECT datacl FROM pg_database WHERE datname = :'live') IS NOT DISTINCT FROM (SELECT datacl FROM pg_database WHERE datname = :'failed') AS acl_same,
       (SELECT array_agg(s.setrole::text || ':' || c ORDER BY s.setrole::text || ':' || c) FROM pg_db_role_setting s, unnest(s.setconfig) c WHERE s.setdatabase = (SELECT oid FROM pg_database WHERE datname = :'live'))
       IS NOT DISTINCT FROM
       (SELECT array_agg(s.setrole::text || ':' || c ORDER BY s.setrole::text || ':' || c) FROM pg_db_role_setting s, unnest(s.setconfig) c WHERE s.setdatabase = (SELECT oid FROM pg_database WHERE datname = :'failed')) AS settings_same
\gset
\if :acl_same
\else
  \echo 'WARNING: datacl differs from the failed DB. Re-apply its GRANT/REVOKE ... ON DATABASE to' :live 'before deploying v4.'
\endif
\if :settings_same
\else
  \echo 'WARNING: per-database settings differ from the failed DB. Re-apply them with ALTER DATABASE' :live 'SET ... before deploying v4.'
\endif
\echo 'Next: run fingerprint.sql on' :live '- flavor must be v4. Only then deploy the v4 rollback task definitions.'
