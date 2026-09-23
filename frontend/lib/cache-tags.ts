/**
 * Centralized cache tag taxonomy.
 *
 * Every `next: { tags }` fetch option and every `revalidateTag()` call should
 * reference constants from this file so invalidation stays consistent.
 *
 * ── Tag → Invalidated by ──────────────────────── Revalidate ────────────
 *
 * droplets        createDroplet, updateDroplet, deepDeleteDroplet,          900s
 *                 duplicateDroplet, publishDraftToOriginal, addLesson,
 *                 updateLesson, deleteLesson, duplicateLessonToDroplet,
 *                 updateDropletFunFact, updateDropletLearningObjective
 *                 (favoriteDroplet does NOT invalidate: explore hearts read
 *                 the per-user favorites-{userId} tag instead)
 *                 (updateDropletAverageRating does NOT invalidate: the
 *                 average is an aggregate and may be up to 900s stale; the
 *                 rater's own rating refreshes via enrollments-{userId})
 * enrollments     Two-level tag system:                                      900s
 *                 ↳ Per-user tag "enrollments-{userId}":
 *                   createEnrollment, createEnrollmentFromEmail,
 *                   createEnrollmentDirect, deleteEnrollment,
 *                   markLessonAsComplete, completeLesson,
 *                   archiveDroplet, togglePlaylistEnrollment,
 *                   enrollInPlaylist, changeEnrollmentRating,
 *                   updateEnrollmentFirstTime, updateViewedLessons,
 *                   updateCompletionDate, favoriteDroplet
 *                 ↳ Global tag "enrollments" (sweeps all users):
 *                   updateDroplet (incl. draft saves), deepDeleteDroplet,
 *                   duplicateDroplet, publishDraftToOriginal, addLesson,
 *                   deleteLesson, duplicateLessonToDroplet
 *                 ↳ shared by all presets: minimal, withLessonIds,
 *                   dashboard, favorites (see enrollment-populates.ts)
 * playlists       createPlaylist, updatePlaylist, deletePlaylist,           900s
 *                 archivePlaylist, togglePlaylistEnrollment,
 *                 enrollInPlaylist, updateDroplet (not draft saves),
 *                 publishDraftToOriginal
 *                 (playlist reads carry authorized_users, which is how the
 *                 playlist page decides "enrolled" — so enrollment toggles
 *                 still sweep this tag)
 * groups          createGroup, updateGroup, updateGroupMembers,             900s
 *                 deleteGroup, archiveGroup, deletePlaylist,
 *                 updateDroplet (not draft saves)
 * authors         createDroplet, updateDroplet (draft saves only when       900s
 *                 authorized_users changes), deepDeleteDroplet,
 *                 duplicateDroplet, publishDraftToOriginal,
 *                 deletePlaylist, deleteGroup, approveCreationRequest,
 *                 updateUserInfo (only when name/bio/photo/links/roles/
 *                 isEnabled change), deleteAuthorizedUser
 * notes           createNote, updateNoteContent, updateNotePosition,        900s
 *                 deleteNote
 * highlights      createHighlight, deleteHighlight                          900s
 * lesson          addLesson, updateLesson, deleteLesson,                    900s
 *                 duplicateLessonToDroplet, deepDeleteDroplet,
 *                 publishDraftToOriginal
 *                 (getLessonBySlug carries only this tag — it returns no
 *                 droplet data, so droplet-level mutations don't flush it)
 * friendships     sendFriendRequest, acceptFriendRequest,                   900s
 *                 rejectFriendRequest, cancelFriendRequest,
 *                 removeFriend, BlockUser, unblockUser
 * announcements   Two-level tag system:                                      900s
 *                 ↳ Global tag "announcements":
 *                   createFriendAnnouncement, createKudosAnnouncement,
 *                   createPlaylistAnnouncement, createGroupAnnouncement,
 *                   createDropletAnnouncement, createSystemAnnouncement,
 *                   createSystemBroadcast, markAnnouncementRead/Unread
 *                   (friend/kudos only — those rows show in friends' feeds)
 *                 ↳ Per-user tag "user-feed-{userId}" (fetchAnnouncements):
 *                   markAnnouncementRead/Unread on a targeted system
 *                   announcement (only its owner's feed can contain it)
 * tags           createNewTag                                              3600s
 * due-dates       assignDropletDueDate, assignPlaylistDueDate,              900s
 *                 updateGroup, updateGroupMembers, deleteGroup,
 *                 archiveGroup (global tag only)
 * reports         createBugReport, deleteReport                             900s
 * access-requests createAccessRequest, deleteAccessRequest                  900s
 * creation-reqs   createCreationRequest, approveCreationRequest,            900s
 *                 deleteCreationRequest
 * datasets        createDataset, deleteDataset                              900s
 *                 (global tag; datasets are scoped to droplets)
 * users           Two-level tag system:                                      900s
 *                 ↳ Global tag "users" (user lists + every record read):
 *                   createAuthorizedUser, createBatchAuthorizedUsers,
 *                   updateUserInfo (admin edits, or self edits of
 *                   fields shown in user lists/search), deleteAuthorizedUser,
 *                   approveCreationRequest
 *                 ↳ Per-user tag "user-{email}" (every
 *                   getAuthorizedUserByEmail read, incl. getCachedUser):
 *                   setTimeZone, updateUserInfo (self edits),
 *                   togglePlaylistEnrollment
 *                 (profile fields, roles, account data only)
 * user-content    Two-level tag system (getCachedUserCreation):              900s
 *                 ↳ Per-user tag "user-content-{userId}":
 *                   createDroplet, duplicateDroplet (every author of the
 *                   new draft), createPlaylist
 *                 ↳ Global tag "user-content" (co-authors / playlist
 *                   creators affected): updateDroplet, deepDeleteDroplet,
 *                   updatePlaylist, deletePlaylist, archivePlaylist,
 *                   publishDraftToOriginal (via finally), voyage mutations
 *                 (droplets + playlists on /my-content)
 * user-dashboard  Two-level tag system (getCachedUserDashboardFull):         900s
 *                 ↳ Per-user tag "user-dashboard-{userId}":
 *                   togglePlaylistEnrollment, enrollInPlaylist,
 *                   createPlaylist
 *                 ↳ Global tag "user-dashboard" (many users affected):
 *                   archivePlaylist, updatePlaylist, deletePlaylist,
 *                   createGroup, updateGroup, updateGroupMembers,
 *                   deleteGroup, archiveGroup, updateDroplet (not draft
 *                   saves), deepDeleteDroplet, archiveVoyage,
 *                   publishDraftToOriginal (via finally)
 *                 (playlists + groups on /dashboard)
 * voyage-enrollments Two-level tag system:                                   900s
 *                 ↳ Per-user tag "voyage-enrollments-{userId}":
 *                   enrollInVoyage, enrollInVoyageDirect,
 *                   unenrollFromVoyage, markVoyageNodeComplete
 *                 ↳ Global tag "voyage-enrollments": no per-user action
 *                   sweeps it (every read also carries the per-user tag of
 *                   each user it returns; voyage reads hold no enrollment
 *                   data)
 * user-social    Per-user tag "user-social-{userId}":                       900s
 *                 sendFriendRequest, acceptFriendRequest,
 *                 rejectFriendRequest, cancelFriendRequest,
 *                 removeFriend, BlockUser, unblockUser
 *                 (friend requests, blocked users, friendships)
 * favorites      Per-user tag "favorites-{userId}"                          900s
 *                 (getFavoritedDropletIds, explore hearts): favoriteDroplet
 */

export const CACHE_TAGS = {
  // Global (shared across all users)
  users: "users", // profile fields, roles, account-level data (global sweep; see user(email))
  allUserContent: "user-content", // global sweep for /my-content (droplets + playlists)
  allUserDashboards: "user-dashboard", // global sweep for /dashboard (playlists + groups)
  userSocial: (userId: number) => `user-social-${userId}`, // friend requests, blocked, friendships
  droplets: "droplets",
  playlists: "playlists",
  authors: "authors",
  lesson: "lesson",
  announcements: "announcements",
  tags: "tags",
  reports: "reports",
  accessRequests: "access-requests",
  creationRequests: "creation-requests",
  allGroups: "groups", // all group queries (getManagedGroups, getGroupBySlug, getGroupByID, getUserGroups, getGroupBySlugV2, fetchAnnouncements)
  allDueDates: "due-dates", // all due date queries (getGroupDueDates, getUserDueDates)
  allEnrollments: "enrollments", // global sweep for content mutations (updateDroplet, addLesson, etc.)
  datasets: "datasets", // global tag for dataset metadata
  voyages: "voyages", // voyages and voyage-node records
  allVoyageEnrollments: "voyage-enrollments", // global sweep; per-user voyage actions use voyageEnrollments(userId)

  // Per-user (scoped to individual user)
  // One user's own authorized-user record. Keyed by email because every
  // cached record read goes through getAuthorizedUserByEmail. Emails always
  // contain "@", so these can't collide with the other "user-*" tags.
  user: (email: string) => `user-${email.trim().toLowerCase()}`,
  userContent: (userId: number) => `user-content-${userId}`, // one user's /my-content
  userDashboard: (userId: number) => `user-dashboard-${userId}`, // one user's /dashboard
  userFeed: (userId: number) => `user-feed-${userId}`, // one user's announcement feed (read state)
  enrollments: (userId: number) => `enrollments-${userId}`,
  voyageEnrollments: (userId: number) => `voyage-enrollments-${userId}`,
  friendships: (userId: number) => `friendships-${userId}`,
  notes: (userId: number) => `notes-${userId}`,
  highlights: (userId: number) => `highlights-${userId}`,
  favorites: (userId: number) => `favorites-${userId}`, // droplet ids the user favorited (explore hearts)
};
