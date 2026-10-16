\set ON_ERROR_STOP on
-- ODY-633 audit (read-only). Run: psql -v ON_ERROR_STOP=1 -f 01-audit.sql
\echo '== 1. Unpublished vs total =='
SELECT 'droplets' AS t, count(*) FILTER (WHERE published_at IS NULL) AS unpublished, count(*) AS total FROM droplets
UNION ALL
SELECT 'lessons' AS t, count(*) FILTER (WHERE published_at IS NULL) AS unpublished, count(*) AS total FROM lessons
UNION ALL
SELECT 'playlists' AS t, count(*) FILTER (WHERE published_at IS NULL) AS unpublished, count(*) AS total FROM playlists
UNION ALL
SELECT 'voyages' AS t, count(*) FILTER (WHERE published_at IS NULL) AS unpublished, count(*) AS total FROM voyages
UNION ALL
SELECT 'creation_requests' AS t, count(*) FILTER (WHERE published_at IS NULL) AS unpublished, count(*) AS total FROM creation_requests;

\echo '== 2. Unpublished rows =='
\echo '-- droplets'
SELECT id, slug, name, status, is_hidden, created_at, updated_at FROM droplets WHERE published_at IS NULL ORDER BY id;
\echo '-- lessons'
SELECT id, slug, name, created_at FROM lessons WHERE published_at IS NULL ORDER BY id;
\echo '-- playlists'
SELECT id, slug, name, is_public, is_archived FROM playlists WHERE published_at IS NULL ORDER BY id;
\echo '-- voyages'
SELECT id, slug, name, status, is_archived FROM voyages WHERE published_at IS NULL ORDER BY id;
\echo '-- creation_requests'
SELECT id, created_at FROM creation_requests WHERE published_at IS NULL ORDER BY id;

\echo '== 3a. Dependents of each unpublished row: (parent, parent_id, via, count) =='
\echo '-- droplet'
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'enrollments_droplet_links' AS via, count(*) FROM enrollments_droplet_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'due_dates_droplet_links' AS via, count(*) FROM due_dates_droplet_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'voyage_nodes_droplet_links' AS via, count(*) FROM voyage_nodes_droplet_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'droplet_lessons_droplet_links' AS via, count(*) FROM droplet_lessons_droplet_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'datasets_droplet_links' AS via, count(*) FROM datasets_droplet_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'groups_droplets_links' AS via, count(*) FROM groups_droplets_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'playlists_droplets_links' AS via, count(*) FROM playlists_droplets_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'droplets_lessons_links' AS via, count(*) FROM droplets_lessons_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'announcements_droplet_links' AS via, count(*) FROM announcements_droplet_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'authorized_users_droplets_links' AS via, count(*) FROM authorized_users_droplets_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'droplets_review_droplet_links' AS via, count(*) FROM droplets_review_droplet_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'droplets_users_favorited_links' AS via, count(*) FROM droplets_users_favorited_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet' AS parent, droplet_id AS parent_id, 'droplets_tags_links' AS via, count(*) FROM droplets_tags_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet', inv_droplet_id, 'droplets_postrequisites_links (inv)', count(*) FROM droplets_postrequisites_links WHERE inv_droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY inv_droplet_id
UNION ALL
SELECT 'droplet', droplet_id, 'droplets_postrequisites_links', count(*) FROM droplets_postrequisites_links WHERE droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY droplet_id
UNION ALL
SELECT 'droplet', original_droplet_id, 'droplets.original_droplet_id', count(*) FROM droplets WHERE original_droplet_id IN (SELECT id FROM droplets WHERE published_at IS NULL) GROUP BY original_droplet_id
ORDER BY 2, 3;
\echo '-- lesson'
SELECT 'lesson' AS parent, lesson_id AS parent_id, 'droplets_lessons_links' AS via, count(*) FROM droplets_lessons_links WHERE lesson_id IN (SELECT id FROM lessons WHERE published_at IS NULL) GROUP BY lesson_id
UNION ALL
SELECT 'lesson' AS parent, lesson_id AS parent_id, 'droplet_lessons_lesson_links' AS via, count(*) FROM droplet_lessons_lesson_links WHERE lesson_id IN (SELECT id FROM lessons WHERE published_at IS NULL) GROUP BY lesson_id
UNION ALL
SELECT 'lesson' AS parent, lesson_id AS parent_id, 'enrollments_viewed_lessons_links' AS via, count(*) FROM enrollments_viewed_lessons_links WHERE lesson_id IN (SELECT id FROM lessons WHERE published_at IS NULL) GROUP BY lesson_id
UNION ALL
SELECT 'lesson' AS parent, lesson_id AS parent_id, 'notes_lesson_links' AS via, count(*) FROM notes_lesson_links WHERE lesson_id IN (SELECT id FROM lessons WHERE published_at IS NULL) GROUP BY lesson_id
UNION ALL
SELECT 'lesson' AS parent, lesson_id AS parent_id, 'highlights_lesson_links' AS via, count(*) FROM highlights_lesson_links WHERE lesson_id IN (SELECT id FROM lessons WHERE published_at IS NULL) GROUP BY lesson_id
UNION ALL
SELECT 'lesson' AS parent, lesson_id AS parent_id, 'lessons_locked_by_links' AS via, count(*) FROM lessons_locked_by_links WHERE lesson_id IN (SELECT id FROM lessons WHERE published_at IS NULL) GROUP BY lesson_id
ORDER BY 2, 3;
\echo '-- playlist'
SELECT 'playlist' AS parent, playlist_id AS parent_id, 'playlists_droplets_links' AS via, count(*) FROM playlists_droplets_links WHERE playlist_id IN (SELECT id FROM playlists WHERE published_at IS NULL) GROUP BY playlist_id
UNION ALL
SELECT 'playlist' AS parent, playlist_id AS parent_id, 'groups_playlists_links' AS via, count(*) FROM groups_playlists_links WHERE playlist_id IN (SELECT id FROM playlists WHERE published_at IS NULL) GROUP BY playlist_id
UNION ALL
SELECT 'playlist' AS parent, playlist_id AS parent_id, 'due_dates_playlist_links' AS via, count(*) FROM due_dates_playlist_links WHERE playlist_id IN (SELECT id FROM playlists WHERE published_at IS NULL) GROUP BY playlist_id
UNION ALL
SELECT 'playlist' AS parent, playlist_id AS parent_id, 'voyage_nodes_playlist_links' AS via, count(*) FROM voyage_nodes_playlist_links WHERE playlist_id IN (SELECT id FROM playlists WHERE published_at IS NULL) GROUP BY playlist_id
UNION ALL
SELECT 'playlist' AS parent, playlist_id AS parent_id, 'announcements_playlist_links' AS via, count(*) FROM announcements_playlist_links WHERE playlist_id IN (SELECT id FROM playlists WHERE published_at IS NULL) GROUP BY playlist_id
UNION ALL
SELECT 'playlist' AS parent, playlist_id AS parent_id, 'authorized_users_created_playlists_links' AS via, count(*) FROM authorized_users_created_playlists_links WHERE playlist_id IN (SELECT id FROM playlists WHERE published_at IS NULL) GROUP BY playlist_id
UNION ALL
SELECT 'playlist' AS parent, playlist_id AS parent_id, 'authorized_users_playlists_archived_links' AS via, count(*) FROM authorized_users_playlists_archived_links WHERE playlist_id IN (SELECT id FROM playlists WHERE published_at IS NULL) GROUP BY playlist_id
UNION ALL
SELECT 'playlist' AS parent, playlist_id AS parent_id, 'playlists_authorized_users_links' AS via, count(*) FROM playlists_authorized_users_links WHERE playlist_id IN (SELECT id FROM playlists WHERE published_at IS NULL) GROUP BY playlist_id
ORDER BY 2, 3;
\echo '-- voyage'
SELECT 'voyage' AS parent, voyage_id AS parent_id, 'voyage_nodes_voyage_links' AS via, count(*) FROM voyage_nodes_voyage_links WHERE voyage_id IN (SELECT id FROM voyages WHERE published_at IS NULL) GROUP BY voyage_id
UNION ALL
SELECT 'voyage' AS parent, voyage_id AS parent_id, 'voyage_enrollments_voyage_links' AS via, count(*) FROM voyage_enrollments_voyage_links WHERE voyage_id IN (SELECT id FROM voyages WHERE published_at IS NULL) GROUP BY voyage_id
UNION ALL
SELECT 'voyage' AS parent, voyage_id AS parent_id, 'groups_voyages_links' AS via, count(*) FROM groups_voyages_links WHERE voyage_id IN (SELECT id FROM voyages WHERE published_at IS NULL) GROUP BY voyage_id
UNION ALL
SELECT 'voyage' AS parent, voyage_id AS parent_id, 'voyages_authors_links' AS via, count(*) FROM voyages_authors_links WHERE voyage_id IN (SELECT id FROM voyages WHERE published_at IS NULL) GROUP BY voyage_id
ORDER BY 2, 3;
\echo '-- creation_request'
SELECT 'creation_request' AS parent, creation_request_id AS parent_id, 'creation_requests_user_links' AS via, count(*) FROM creation_requests_user_links WHERE creation_request_id IN (SELECT id FROM creation_requests WHERE published_at IS NULL) GROUP BY creation_request_id
UNION ALL
SELECT 'creation_request' AS parent, creation_request_id AS parent_id, 'creation_requests_voyage_node_links' AS via, count(*) FROM creation_requests_voyage_node_links WHERE creation_request_id IN (SELECT id FROM creation_requests WHERE published_at IS NULL) GROUP BY creation_request_id
ORDER BY 2, 3;

-- 3b lists the main exposure paths only; 3a is the complete list of links per unpublished row. Read both.
\echo '== 3b. Main exposure paths (3a is the complete list): published parents linking to unpublished children (visible after the switch): (child, child_id, parent, parent_id, via) =='
SELECT 'lesson' AS child, l.lesson_id AS child_id, 'droplet' AS parent, l.droplet_id AS parent_id, 'droplets_lessons_links' AS via FROM droplets_lessons_links l JOIN lessons c ON c.id = l.lesson_id JOIN droplets p ON p.id = l.droplet_id WHERE c.published_at IS NULL AND p.published_at IS NOT NULL
UNION ALL
SELECT 'lesson', dl.lesson_id, 'droplet', dd.droplet_id, 'droplet_lessons' FROM droplet_lessons_lesson_links dl JOIN droplet_lessons_droplet_links dd ON dd.droplet_lesson_id = dl.droplet_lesson_id JOIN lessons c ON c.id = dl.lesson_id JOIN droplets p ON p.id = dd.droplet_id WHERE c.published_at IS NULL AND p.published_at IS NOT NULL
UNION ALL
SELECT 'droplet', l.droplet_id, 'playlist', l.playlist_id, 'playlists_droplets_links' FROM playlists_droplets_links l JOIN droplets c ON c.id = l.droplet_id JOIN playlists p ON p.id = l.playlist_id WHERE c.published_at IS NULL AND p.published_at IS NOT NULL
UNION ALL
SELECT 'droplet', l.droplet_id, 'group', l.group_id, 'groups_droplets_links' FROM groups_droplets_links l JOIN droplets c ON c.id = l.droplet_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'droplet', l.droplet_id, 'voyage_node', l.voyage_node_id, 'voyage_nodes_droplet_links' FROM voyage_nodes_droplet_links l JOIN droplets c ON c.id = l.droplet_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'droplet', d.original_droplet_id, 'droplet', d.id, 'droplets.original_droplet_id' FROM droplets d JOIN droplets c ON c.id = d.original_droplet_id WHERE c.published_at IS NULL AND d.published_at IS NOT NULL
UNION ALL
SELECT 'playlist', l.playlist_id, 'group', l.group_id, 'groups_playlists_links' FROM groups_playlists_links l JOIN playlists c ON c.id = l.playlist_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'playlist', l.playlist_id, 'voyage_node', l.voyage_node_id, 'voyage_nodes_playlist_links' FROM voyage_nodes_playlist_links l JOIN playlists c ON c.id = l.playlist_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'voyage', l.voyage_id, 'group', l.group_id, 'groups_voyages_links' FROM groups_voyages_links l JOIN voyages c ON c.id = l.voyage_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'droplet', l.droplet_id, 'droplet', l.inv_droplet_id, 'droplets_postrequisites_links' FROM droplets_postrequisites_links l JOIN droplets c ON c.id = l.droplet_id JOIN droplets p ON p.id = l.inv_droplet_id WHERE c.published_at IS NULL AND p.published_at IS NOT NULL
UNION ALL
SELECT 'droplet', l.inv_droplet_id, 'droplet', l.droplet_id, 'droplets_postrequisites_links (inv)' FROM droplets_postrequisites_links l JOIN droplets c ON c.id = l.inv_droplet_id JOIN droplets p ON p.id = l.droplet_id WHERE c.published_at IS NULL AND p.published_at IS NOT NULL
UNION ALL
SELECT 'droplet', l.droplet_id, 'enrollment', l.enrollment_id, 'enrollments_droplet_links' FROM enrollments_droplet_links l JOIN droplets c ON c.id = l.droplet_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'droplet', l.droplet_id, 'due_date', l.due_date_id, 'due_dates_droplet_links' FROM due_dates_droplet_links l JOIN droplets c ON c.id = l.droplet_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'playlist', l.playlist_id, 'due_date', l.due_date_id, 'due_dates_playlist_links' FROM due_dates_playlist_links l JOIN playlists c ON c.id = l.playlist_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'droplet', l.droplet_id, 'tag', l.tag_id, 'droplets_tags_links' FROM droplets_tags_links l JOIN droplets c ON c.id = l.droplet_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'droplet', l.droplet_id, 'authorized_user', l.authorized_user_id, 'authorized_users_droplets_links' FROM authorized_users_droplets_links l JOIN droplets c ON c.id = l.droplet_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'playlist', l.playlist_id, 'authorized_user', l.authorized_user_id, 'authorized_users_created_playlists_links' FROM authorized_users_created_playlists_links l JOIN playlists c ON c.id = l.playlist_id WHERE c.published_at IS NULL
UNION ALL
SELECT 'lesson', l.lesson_id, 'enrollment', l.enrollment_id, 'enrollments_viewed_lessons_links' FROM enrollments_viewed_lessons_links l JOIN lessons c ON c.id = l.lesson_id WHERE c.published_at IS NULL
ORDER BY 1, 2, 3, 4;

\echo '== 4. Publish permissions the switch will remove (save for rollback) =='
SELECT p.id, p.action, p.subject, p.properties, p.conditions, r.id AS role_id, r.name AS role
  FROM admin_permissions p
  LEFT JOIN admin_permissions_role_links l ON l.permission_id = p.id
  LEFT JOIN admin_roles r ON r.id = l.role_id
 WHERE p.action = 'plugin::content-manager.explorer.publish'
 ORDER BY p.id;

\echo '== 5. Baseline orphan counts =='
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
