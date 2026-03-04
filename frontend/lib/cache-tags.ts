/**
 * Centralized cache tag taxonomy.
 *
 * Every `next: { tags }` fetch option and every `revalidateTag()` call should
 * reference constants from this file so invalidation stays consistent.
 *
 * ── Tag → Invalidated by ──────────────────────── Revalidate ────────────
 *
 * droplets        createDroplet, updateDroplet, deepDeleteDroplet,          900s
 *                 publishDraftDroplet, addLesson, updateLesson,
 *                 deleteLesson, updateDropletFunFact
 * enrollments     Two-level tag system:                                      900s
 *                 ↳ Per-user tag "enrollments-{userId}":
 *                   createEnrollment, createEnrollmentFromEmail,
 *                   deleteEnrollment, markLessonAsComplete, completeLesson,
 *                   archiveDroplet, togglePlaylistEnrollment,
 *                   enrollInPlaylist, changeEnrollmentRating,
 *                   updateEnrollmentFirstTime, updateViewedLessons,
 *                   updateCompletionDate, favoriteDroplet
 *                 ↳ Global tag "enrollments" (sweeps all users):
 *                   updateDroplet, deepDeleteDroplet, publishDraftDroplet,
 *                   addLesson, deleteLesson, duplicateLessonToDroplet,
 *                   updateDropletAverageRating
 *                 ↳ shared by all presets: minimal, withLessonIds,
 *                   dashboard, favorites (see enrollment-populates.ts)
 * playlists       createPlaylist, updatePlaylist, deletePlaylist,           900s
 *                 archivePlaylist, togglePlaylistEnrollment
 * groups          createGroup, updateGroup, deleteGroup,                    900s
 *                 updateGroupMembers, archiveGroup (global tag only)
 * authors         updateDroplet, createDroplet, deepDeleteDroplet,          900s
 *                 publishDraftDroplet, deletePlaylist, deleteGroup
 * notes           createNote, updateNote, deleteNote, duplicateNote         900s
 * highlights      createHighlight, deleteHighlight                          900s
 * lesson          updateLesson                                              900s
 * friendships     sendFriendRequest, acceptFriendRequest,                   900s
 *                 rejectFriendRequest, cancelFriendRequest,
 *                 removeFriend, blockUser, unblockUser
 * announcements   createFriend/Kudos/Playlist/Group/Droplet/               900s
 *                 SystemAnnouncement
 * tags            createNewTag                                              3600s
 * due-dates       assignDropletDueDate, assignPlaylistDueDate               900s
 *                 (global tag only)
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
  allGroups: "groups", // all group queries (getManagedGroups, getGroupBySlug, getGroupByID, getUserGroups, getGroupBySlugV2, fetchAnnouncements)
  allDueDates: "due-dates", // all due date queries (getGroupDueDates, getUserDueDates)
  allEnrollments: "enrollments", // global sweep for content mutations (updateDroplet, addLesson, etc.)

  // Per-user (scoped to individual user)
  enrollments: (userId: number) => `enrollments-${userId}`,
  friendships: (userId: number) => `friendships-${userId}`,
  notes: (userId: number) => `notes-${userId}`,
  highlights: (userId: number) => `highlights-${userId}`,
};
