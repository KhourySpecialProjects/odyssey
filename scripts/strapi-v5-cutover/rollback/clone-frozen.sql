\set ON_ERROR_STOP on
-- ODY-596: copy <src> to the frozen v4 rollback copy, after the 01 gate and before the merge. Backend must be at 0.
-- Run while connected to postgres: psql -d postgres -v src=<db> -v frozen=<db>_v4_frozen -f clone-frozen.sql
\if :{?src}
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: pass -v src=<database name>'; END $$;
\endif
\if :{?frozen}
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: pass -v frozen=<frozen copy name>'; END $$;
\endif

SELECT current_database() NOT IN (:'src', :'frozen') AS ok_db,
       :'src' <> :'frozen' AS ok_names,
       EXISTS (SELECT 1 FROM pg_database WHERE datname = :'src') AS src_exists,
       NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'frozen') AS frozen_free,
       (SELECT count(*) FROM pg_stat_activity WHERE datname = :'src' AND pid <> pg_backend_pid()) = 0 AS src_idle,
       (SELECT rolsuper OR rolcreatedb FROM pg_roles WHERE rolname = current_user) AS can_create
\gset
\if :ok_db
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: connect to the postgres database, not to src or frozen'; END $$;
\endif
\if :ok_names
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: src and frozen must be different names'; END $$;
\endif
\if :src_exists
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: src database does not exist'; END $$;
\endif
\if :frozen_free
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: frozen database already exists; nothing was changed'; END $$;
\endif
\if :src_idle
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: other sessions are connected to src; scale the backend to 0 and close them first'; END $$;
\endif
\if :can_create
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: the current role needs CREATEDB'; END $$;
\endif

-- OWNER needs membership in the owner role (the RDS master user is not a true superuser).
SELECT pg_get_userbyid(datdba) AS src_owner FROM pg_database WHERE datname = :'src' \gset
SELECT pg_has_role(current_user, :'src_owner', 'MEMBER') AS owner_ok \gset
\if :owner_ok
\else
  DO $$ BEGIN RAISE EXCEPTION 'ODY-596: the current role must be a member of the src owner role'; END $$;
\endif

\timing on
CREATE DATABASE :"frozen" WITH TEMPLATE :"src" OWNER :"src_owner";
\timing off

\echo '== Source and copy (datacl and per-database settings are not copied by TEMPLATE; re-apply any difference by hand) =='
SELECT d.datname, pg_get_userbyid(d.datdba) AS owner, d.datacl,
       (SELECT string_agg(array_to_string(s.setconfig, ', '), '; ') FROM pg_db_role_setting s WHERE s.setdatabase = d.oid AND s.setrole = 0) AS db_settings
  FROM pg_database d
 WHERE d.datname IN (:'src', :'frozen')
 ORDER BY d.datname = :'frozen';
SELECT (SELECT datacl FROM pg_database WHERE datname = :'src') IS NOT DISTINCT FROM (SELECT datacl FROM pg_database WHERE datname = :'frozen') AS acl_same,
       (SELECT array_agg(s.setrole::text || ':' || c ORDER BY s.setrole::text || ':' || c) FROM pg_db_role_setting s, unnest(s.setconfig) c WHERE s.setdatabase = (SELECT oid FROM pg_database WHERE datname = :'src'))
       IS NOT DISTINCT FROM
       (SELECT array_agg(s.setrole::text || ':' || c ORDER BY s.setrole::text || ':' || c) FROM pg_db_role_setting s, unnest(s.setconfig) c WHERE s.setdatabase = (SELECT oid FROM pg_database WHERE datname = :'frozen')) AS settings_same
\gset
\if :acl_same
\else
  \echo 'WARNING: datacl differs. Re-apply the src GRANT/REVOKE ... ON DATABASE to the frozen copy now, so a rollback keeps them.'
\endif
\if :settings_same
\else
  \echo 'WARNING: per-database settings differ. Re-apply them with ALTER DATABASE <frozen> SET ... now, so a rollback keeps them.'
\endif
\echo 'Next: run fingerprint.sql on both databases. Both flavors must be v4 and section 4 must diff clean.'
