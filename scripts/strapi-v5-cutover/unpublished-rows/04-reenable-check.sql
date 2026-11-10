\set ON_ERROR_STOP on
-- ODY-633 rollback check after re-enabling D&P (read-only). Expect nulls = 0 and equal_created_at = total.
\echo '== 1. published_at back-fill =='
SELECT 'droplets' AS t, count(*) FILTER (WHERE published_at IS NULL) AS nulls, count(*) FILTER (WHERE published_at = created_at) AS equal_created_at, count(*) AS total FROM droplets
UNION ALL
SELECT 'lessons', count(*) FILTER (WHERE published_at IS NULL), count(*) FILTER (WHERE published_at = created_at), count(*) FROM lessons
UNION ALL
SELECT 'playlists', count(*) FILTER (WHERE published_at IS NULL), count(*) FILTER (WHERE published_at = created_at), count(*) FROM playlists
UNION ALL
SELECT 'voyages', count(*) FILTER (WHERE published_at IS NULL), count(*) FILTER (WHERE published_at = created_at), count(*) FROM voyages
UNION ALL
SELECT 'creation_requests', count(*) FILTER (WHERE published_at IS NULL), count(*) FILTER (WHERE published_at = created_at), count(*) FROM creation_requests;

\echo '== 2. Publish permissions that came back (compare with 01 section 4) =='
SELECT p.id, p.subject, r.id AS role_id, r.name AS role
  FROM admin_permissions p
  LEFT JOIN admin_permissions_role_links l ON l.permission_id = p.id
  LEFT JOIN admin_roles r ON r.id = l.role_id
 WHERE p.action = 'plugin::content-manager.explorer.publish'
 ORDER BY p.id;
