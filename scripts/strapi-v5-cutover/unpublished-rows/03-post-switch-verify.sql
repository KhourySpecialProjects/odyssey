\set ON_ERROR_STOP on
-- ODY-633 post-switch check for Strapi v5 (read-only). Run after the first v5 boot: psql -v ON_ERROR_STOP=1 -f 03-post-switch-verify.sql
-- v5 keeps published_at and renames join tables (*_lnk). 01 and 02 stay on v4 names because they run before the first v5 boot.
-- The boot cutoff is the first v5 migration's time, so rows users create after step 9 don't break the match.
\echo '== 1. Row totals (before_v5_boot must equal the post-02 gate run of 01 section 1 exactly; created_since_boot is new user content) =='
WITH boot AS (SELECT min(time) AS t FROM strapi_migrations_internal WHERE name LIKE '5.0.0-%')
SELECT 'droplets' AS t, count(*) FILTER (WHERE created_at < boot.t) AS before_v5_boot, count(*) FILTER (WHERE created_at >= boot.t) AS created_since_boot FROM droplets, boot GROUP BY boot.t
UNION ALL SELECT 'lessons', count(*) FILTER (WHERE created_at < boot.t), count(*) FILTER (WHERE created_at >= boot.t) FROM lessons, boot GROUP BY boot.t
UNION ALL SELECT 'playlists', count(*) FILTER (WHERE created_at < boot.t), count(*) FILTER (WHERE created_at >= boot.t) FROM playlists, boot GROUP BY boot.t
UNION ALL SELECT 'voyages', count(*) FILTER (WHERE created_at < boot.t), count(*) FILTER (WHERE created_at >= boot.t) FROM voyages, boot GROUP BY boot.t
UNION ALL SELECT 'creation_requests', count(*) FILTER (WHERE created_at < boot.t), count(*) FILTER (WHERE created_at >= boot.t) FROM creation_requests, boot GROUP BY boot.t;

\echo '== 2. v5 internal migrations missing (expect 0 rows) =='
SELECT m.name FROM (VALUES
  ('5.0.0-rename-identifiers-longer-than-max-length'),
  ('5.0.0-02-created-document-id'),
  ('5.0.0-03-created-locale'),
  ('5.0.0-04-created-published-at'),
  ('5.0.0-05-drop-slug-fields-index'),
  ('5.0.0-06-add-document-id-indexes'),
  ('core::5.0.0-discard-drafts')
) AS m(name)
WHERE NOT EXISTS (SELECT 1 FROM strapi_migrations_internal i WHERE i.name = m.name);

\echo '== 3. Document checks with D&P off: one published row per document (expect every count 0) =='
SELECT 'droplets' AS t, count(*) FILTER (WHERE published_at IS NULL) AS null_published_at, count(*) FILTER (WHERE document_id IS NULL) AS null_document_id, count(*) - count(DISTINCT document_id) AS duplicate_document_id, count(*) FILTER (WHERE locale IS NOT NULL) AS has_locale FROM droplets
UNION ALL
SELECT 'lessons', count(*) FILTER (WHERE published_at IS NULL), count(*) FILTER (WHERE document_id IS NULL), count(*) - count(DISTINCT document_id), count(*) FILTER (WHERE locale IS NOT NULL) FROM lessons
UNION ALL
SELECT 'playlists', count(*) FILTER (WHERE published_at IS NULL), count(*) FILTER (WHERE document_id IS NULL), count(*) - count(DISTINCT document_id), count(*) FILTER (WHERE locale IS NOT NULL) FROM playlists
UNION ALL
SELECT 'voyages', count(*) FILTER (WHERE published_at IS NULL), count(*) FILTER (WHERE document_id IS NULL), count(*) - count(DISTINCT document_id), count(*) FILTER (WHERE locale IS NOT NULL) FROM voyages
UNION ALL
SELECT 'creation_requests', count(*) FILTER (WHERE published_at IS NULL), count(*) FILTER (WHERE document_id IS NULL), count(*) - count(DISTINCT document_id), count(*) FILTER (WHERE locale IS NOT NULL) FROM creation_requests;

-- v5 registers the publish action for every content type, so Super Admin gets it back on boot. It has no effect while D&P is off.
\echo '== 4. Publish permissions outside Super Admin (must equal the non-Super-Admin rows of 01 section 4; inert while D&P is off) =='
SELECT p.id, p.action, p.subject, p.properties, p.conditions, r.id AS role_id, r.name AS role
  FROM admin_permissions p
  LEFT JOIN admin_permissions_role_lnk l ON l.permission_id = p.id
  LEFT JOIN admin_roles r ON r.id = l.role_id
 WHERE p.action = 'plugin::content-manager.explorer.publish'
   AND r.code IS DISTINCT FROM 'strapi-super-admin'
 ORDER BY p.id;

\echo '== 5. Orphan counts (compare with 01 section 5) =='
SELECT 'enrollments without droplet' AS orphan, count(*) FROM enrollments e
 WHERE NOT EXISTS (SELECT 1 FROM enrollments_droplet_lnk l WHERE l.enrollment_id = e.id)
UNION ALL
SELECT 'due_dates without droplet or playlist', count(*) FROM due_dates d
 WHERE NOT EXISTS (SELECT 1 FROM due_dates_droplet_lnk l WHERE l.due_date_id = d.id)
   AND NOT EXISTS (SELECT 1 FROM due_dates_playlist_lnk l WHERE l.due_date_id = d.id)
UNION ALL
SELECT 'voyage_nodes without voyage', count(*) FROM voyage_nodes n
 WHERE NOT EXISTS (SELECT 1 FROM voyage_nodes_voyage_lnk l WHERE l.voyage_node_id = n.id)
UNION ALL
SELECT 'droplet_lessons without droplet or lesson', count(*) FROM droplet_lessons dl
 WHERE NOT EXISTS (SELECT 1 FROM droplet_lessons_droplet_lnk l WHERE l.droplet_lesson_id = dl.id)
    OR NOT EXISTS (SELECT 1 FROM droplet_lessons_lesson_lnk l WHERE l.droplet_lesson_id = dl.id)
UNION ALL
SELECT 'datasets without droplet', count(*) FROM datasets s
 WHERE NOT EXISTS (SELECT 1 FROM datasets_droplet_lnk l WHERE l.dataset_id = s.id);
