\set ON_ERROR_STOP on
-- ODY-633 post-switch check (read-only). Run: psql -v ON_ERROR_STOP=1 -f 03-post-switch-verify.sql
\echo '== 1. Row totals (compare with the post-02 gate run of 01 section 1; must match exactly) =='
SELECT 'droplets' AS t, count(*) AS total FROM droplets
UNION ALL SELECT 'lessons', count(*) FROM lessons
UNION ALL SELECT 'playlists', count(*) FROM playlists
UNION ALL SELECT 'voyages', count(*) FROM voyages
UNION ALL SELECT 'creation_requests', count(*) FROM creation_requests;

\echo '== 2. published_at columns left (expect 0 rows) =='
SELECT table_name FROM information_schema.columns
 WHERE column_name = 'published_at' AND table_schema = current_schema()
   AND table_name IN ('droplets', 'lessons', 'playlists', 'voyages', 'creation_requests');

\echo '== 3. Publish permissions left (expect 0) =='
SELECT count(*) FROM admin_permissions WHERE action = 'plugin::content-manager.explorer.publish';

\echo '== 4. Orphan counts (compare with 01 section 5) =='
SELECT 'enrollments without droplet' AS orphan, count(*) FROM enrollments e
 WHERE NOT EXISTS (SELECT 1 FROM enrollments_droplet_links l WHERE l.enrollment_id = e.id)
UNION ALL
SELECT 'due_dates without droplet or playlist', count(*) FROM due_dates d
 WHERE NOT EXISTS (SELECT 1 FROM due_dates_droplet_links l WHERE l.due_date_id = d.id)
   AND NOT EXISTS (SELECT 1 FROM due_dates_playlist_links l WHERE l.due_date_id = d.id)
UNION ALL
SELECT 'voyage_nodes without voyage', count(*) FROM voyage_nodes n
 WHERE NOT EXISTS (SELECT 1 FROM voyage_nodes_voyage_links l WHERE l.voyage_node_id = n.id)
UNION ALL
SELECT 'droplet_lessons without droplet or lesson', count(*) FROM droplet_lessons dl
 WHERE NOT EXISTS (SELECT 1 FROM droplet_lessons_droplet_links l WHERE l.droplet_lesson_id = dl.id)
    OR NOT EXISTS (SELECT 1 FROM droplet_lessons_lesson_links l WHERE l.droplet_lesson_id = dl.id)
UNION ALL
SELECT 'datasets without droplet', count(*) FROM datasets s
 WHERE NOT EXISTS (SELECT 1 FROM datasets_droplet_links l WHERE l.dataset_id = s.id);
