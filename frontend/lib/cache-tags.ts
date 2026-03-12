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
 *                   updateDroplet, deepDeleteDroplet,
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
 *                 deletePlaylist, deleteGroup
 * notes           createNote, updateNoteContent, updateNotePosition,        900s
 *                 deleteNote
 * highlights      createHighlight, deleteHighlight                          900s
 * lesson          updateLesson, publishDraftToOriginal                      900s
 * friendships     sendFriendRequest, acceptFriendRequest,                   900s
 *                 rejectFriendRequest, cancelFriendRequest,
 *                 removeFriend, BlockUser, unblockUser
 * announcements   createFriendAnnouncement, createKudosAnnouncement,        900s
 *                 createPlaylistAnnouncement, createGroupAnnouncement,
 *                 createDropletAnnouncement, createSystemAnnouncement
 * tags            createNewTag                                              3600s
 * due-dates       assignDropletDueDate, assignPlaylistDueDate               900s
 *                 (global tag only)
 * reports         createBugReport, deleteReport                             900s
 * access-requests createAccessRequest, deleteAccessRequest                  900s
 * creation-reqs   createCreationRequest, approveCreationRequest,            900s
 *                 deleteCreationRequest
 * users           createAuthorizedUser, createBatchAuthorizedUsers,         900s
 *                 updateUserInfo, deleteAuthorizedUser, setTimeZone,
 *                 approveCreationRequest
 */

export const CACHE_TAGS = {
  // Global (shared across all users)
  users: "users",
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

  // Per-user (scoped to individual user)
  enrollments: (userId: number) => `enrollments-${userId}`,
  friendships: (userId: number) => `friendships-${userId}`,
  notes: (userId: number) => `notes-${userId}`,
  highlights: (userId: number) => `highlights-${userId}`,
};
