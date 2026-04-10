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
 *                 updateDropletAverageRating, updateDropletFunFact,
 *                 favoriteDroplet, updateDropletLearningObjective
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
 *                   updateDroplet, deepDeleteDroplet, duplicateDroplet,
 *                   publishDraftToOriginal, addLesson, deleteLesson,
 *                   duplicateLessonToDroplet, updateDropletAverageRating,
 *                   togglePlaylistEnrollment, enrollInPlaylist
 *                 ↳ shared by all presets: minimal, withLessonIds,
 *                   dashboard, favorites (see enrollment-populates.ts)
 * playlists       createPlaylist, updatePlaylist, deletePlaylist,           900s
 *                 archivePlaylist, togglePlaylistEnrollment,
 *                 enrollInPlaylist, updateDroplet,
 *                 publishDraftToOriginal
 * groups          createGroup, updateGroup, updateGroupMembers,             900s
 *                 deleteGroup, archiveGroup, deletePlaylist,
 *                 updateDroplet
 * authors         createDroplet, updateDroplet, deepDeleteDroplet,          900s
 *                 duplicateDroplet, publishDraftToOriginal,
 *                 deletePlaylist, deleteGroup, approveCreationRequest,
 *                 updateUserInfo, deleteAuthorizedUser
 * notes           createNote, updateNoteContent, updateNotePosition,        900s
 *                 deleteNote
 * highlights      createHighlight, deleteHighlight                          900s
 * lesson          addLesson, updateLesson, deleteLesson,                    900s
 *                 duplicateLessonToDroplet, publishDraftToOriginal
 * friendships     sendFriendRequest, acceptFriendRequest,                   900s
 *                 rejectFriendRequest, cancelFriendRequest,
 *                 removeFriend, BlockUser, unblockUser
 * announcements   createFriendAnnouncement, createKudosAnnouncement,        900s
 *                 createPlaylistAnnouncement, createGroupAnnouncement,
 *                 createDropletAnnouncement, createSystemAnnouncement
 * tags            createNewTag                                              3600s
 * due-dates       assignDropletDueDate, assignPlaylistDueDate,              900s
 *                 updateGroup, updateGroupMembers, deleteGroup,
 *                 archiveGroup (global tag only)
 * reports         createBugReport, deleteReport                             900s
 * access-requests createAccessRequest, deleteAccessRequest                  900s
 * creation-reqs   createCreationRequest, approveCreationRequest,            900s
 *                 deleteCreationRequest
 * datasets        createDataset, deleteDataset                              900s
 *                 (global tag; datasets are scoped to droplets)
 * users           createAuthorizedUser, createBatchAuthorizedUsers,         900s
 *                 updateUserInfo, deleteAuthorizedUser, setTimeZone,
 *                 approveCreationRequest
 *                 (profile fields, roles, account data only)
 * user-content    createDroplet, updateDroplet, duplicateDroplet,            900s
 *                 deepDeleteDroplet, createPlaylist, updatePlaylist,
 *                 deletePlaylist, publishDraftToOriginal (via finally)
 *                 (droplets + playlists on /my-content)
 * user-dashboard  createPlaylist, archivePlaylist, updatePlaylist,           900s
 *                 deletePlaylist, createGroup, updateGroup,
 *                 updateGroupMembers, deleteGroup, archiveGroup,
 *                 updateDroplet, deepDeleteDroplet,
 *                 togglePlaylistEnrollment, enrollInPlaylist,
 *                 publishDraftToOriginal (via finally)
 *                 (playlists + groups on /dashboard)
 * user-social     Per-user tag "user-social-{userId}":                       900s
 *                 sendFriendRequest, acceptFriendRequest,
 *                 rejectFriendRequest, cancelFriendRequest,
 *                 removeFriend, BlockUser, unblockUser
 *                 (friend requests, blocked users, friendships)
 */

export const CACHE_TAGS = {
  // Global (shared across all users)
  users: "users", // profile fields, roles, account-level data
  userContent: "user-content", // user's droplets + playlists (/my-content)
  userDashboard: "user-dashboard", // user's playlists + groups (/dashboard)
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
  allVoyageEnrollments: "voyage-enrollments", // global sweep for voyage enrollment mutations

  // Per-user (scoped to individual user)
  enrollments: (userId: number) => `enrollments-${userId}`,
  voyageEnrollments: (userId: number) => `voyage-enrollments-${userId}`,
  friendships: (userId: number) => `friendships-${userId}`,
  notes: (userId: number) => `notes-${userId}`,
  highlights: (userId: number) => `highlights-${userId}`,
};
