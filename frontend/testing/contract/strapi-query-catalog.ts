// Calls the capture test makes with sentinel args (ODY-635 D2). SKIPPED holds every other export.
import type { StrapiCollection } from "@/lib/strapi-document-id";

export const SLUG = "ody635-sentinel";
export const EMAIL = "ody635@example.invalid";

export type CapturedRequest = {
  fn: string;
  kind: "read" | "write";
  method: string;
  path: string;
  query: string;
  collection: string;
  body?: unknown;
};

/** Returns a v4-shaped JSON body for a request, or undefined to use the default. */
export type Responder = (req: {
  method: string;
  path: string;
  query: string;
  body?: unknown;
}) => unknown;

export type Call<T> = {
  fn: keyof T & string;
  run: (m: T) => Promise<unknown>;
  respond?: Responder;
};

/** Keeps `fn` typed against the module while the table stays heterogeneous. */
export function defineModule<T>(calls: Call<T>[]): Call<never>[] {
  return calls as unknown as Call<never>[];
}

export const USER = {
  id: 1,
  documentId: "ody635userdoc",
  email: EMAIL,
  firstName: "Sentinel",
  lastName: "User",
} as never;

export const DROPLET = {
  id: 1,
  documentId: "ody635dropletdoc",
  slug: SLUG,
  name: "Sentinel droplet",
  type: "droplet",
  lessons: [],
} as never;

export const PLAYLIST = {
  id: 1,
  documentId: "ody635playlistdoc",
  slug: SLUG,
  name: "Sentinel playlist",
} as never;

export const GROUP = {
  id: 1,
  documentId: "ody635groupdoc",
  slug: SLUG,
  groupName: "Sentinel group",
  members: [],
  admins: [],
  managers: [],
  droplets: [],
  playlists: [],
  voyages: [],
} as never;

// Record<StrapiCollection, true> fails to compile when a collection is added without updating this list.
const COLLECTIONS: Record<StrapiCollection, true> = {
  "access-requests": true,
  announcements: true,
  "authorized-users": true,
  "authorized-user-roles": true,
  "creation-requests": true,
  datasets: true,
  droplets: true,
  "droplet-lessons": true,
  "due-dates": true,
  enrollments: true,
  friendships: true,
  galleries: true,
  groups: true,
  highlights: true,
  lessons: true,
  notes: true,
  playlists: true,
  reports: true,
  tags: true,
  voyages: true,
  "voyage-enrollments": true,
  "voyage-nodes": true,
  "voyage-node-completions": true,
};
export const ALL_COLLECTIONS = Object.keys(COLLECTIONS) as StrapiCollection[];

// v4-shaped response builders for the write flows' pre-GETs.
const ent = (id: number, attributes: Record<string, unknown> = {}) => ({
  id,
  documentId: `ody635doc${id}`,
  attributes,
});
const rel = (...items: unknown[]) => ({ data: items });
const list = (...items: unknown[]) => ({
  data: items,
  meta: {
    pagination: { page: 1, pageSize: 25, pageCount: 1, total: items.length },
  },
});

type Route = [method: string, path: RegExp, payload: unknown, query?: RegExp];
const routes =
  (table: Route[]): Responder =>
  (req) => {
    const q = decodeURIComponent(req.query);
    for (const [method, pathRe, payload, queryRe] of table) {
      if (
        method === req.method &&
        pathRe.test(req.path) &&
        (!queryRe || queryRe.test(q))
      ) {
        return payload;
      }
    }
    return undefined;
  };

const ME = ent(1, {
  email: "admin@example.invalid",
  firstName: "Ad",
  lastName: "Min",
});
const ME_ROUTE: Route = ["GET", /^\/authorized-users$/, list(ME)];

const QUIZ_BLOCK = {
  id: 11,
  __component: "droplets.quiz",
  questions: [
    {
      id: 12,
      content: "<p>Q</p>",
      answerOptions: [{ id: 13, isCorrect: true, content: "A" }],
    },
  ],
};
const GENERIC_BLOCK = {
  id: 14,
  __component: "droplets.generic",
  content: "<p>Body</p>",
};

const lessonEnt = (id: number, version: "v1" | "v2") =>
  ent(id, {
    name: `Lesson ${id}`,
    slug: `lesson-${id}`,
    type: "lesson",
    orderIndex: id,
    notes: null,
    blocksVersion: version,
    ...(version === "v2"
      ? { blocksV2: [{ type: "paragraph", content: "x" }] }
      : { blocks: [QUIZ_BLOCK, GENERIC_BLOCK] }),
  });

const dropletEnt = (id: number, extra: Record<string, unknown> = {}) =>
  ent(id, {
    name: `Droplet ${id}`,
    slug: `droplet-${id}`,
    focusArea: "technical",
    type: "knowledge",
    difficulty: "beginner",
    description: "d",
    overview: "o",
    status: "published",
    tags: rel(ent(2, { name: "t" })),
    authorized_users: rel(ent(4)),
    prerequisites: rel(ent(8)),
    postrequisites: rel(),
    learningObjectives: [{ id: 3, objective: "Learn" }],
    nextSteps: [{ id: 9, label: "Next", url: "https://example.com" }],
    lessons: rel(lessonEnt(5, "v1"), lessonEnt(6, "v2")),
    ...extra,
  });

const DUPLICATE_DROPLET = routes([
  ME_ROUTE,
  ["GET", /^\/droplets$/, list(), /originalDropletId/],
  ["GET", /^\/droplets$/, list(dropletEnt(1))],
]);

const PUBLISH_DRAFT = routes([
  ME_ROUTE,
  [
    "GET",
    /^\/droplets$/,
    list(
      dropletEnt(1, {
        status: "draft",
        lessons: rel(lessonEnt(5, "v1"), lessonEnt(7, "v2")),
      }),
    ),
    /id\]\[\$eq\]=1(&|$)/,
  ],
  [
    "GET",
    /^\/droplets$/,
    list(
      dropletEnt(2, { lessons: rel(lessonEnt(6, "v1"), lessonEnt(8, "v1")) }),
    ),
    /id\]\[\$eq\]=2(&|$)/,
  ],
  ["GET", /^\/enrollments$/, list(ent(30, { authorizedUser: rel(ent(1)) }))],
]);

type Mod = Record<string, unknown>;
const call = <T extends Mod>(
  fn: keyof T & string,
  run: (m: T) => Promise<unknown>,
  respond?: Responder,
): Call<T> => ({ fn, run, ...(respond && { respond }) });

/** Request modules (keys of CAPTURED / SKIPPED) and where they live. */
export const MODULE_PATHS: Record<string, string> = {
  "admin-stats": "@/lib/requests/admin-stats",
  analytics: "@/lib/requests/analytics",
  "authorized-user-roles": "@/lib/requests/authorized-user-roles",
  "authorized-user": "@/lib/requests/authorized-user",
  cached: "@/lib/requests/cached",
  data: "@/lib/requests/data",
  dataset: "@/lib/requests/dataset",
  "droplet-analytics": "@/lib/requests/droplet-analytics",
  droplet: "@/lib/requests/droplet",
  enrollment: "@/lib/requests/enrollment",
  feed: "@/lib/requests/feed",
  friends: "@/lib/requests/friends",
  galleries: "@/lib/requests/galleries",
  groups: "@/lib/requests/groups",
  highlights: "@/lib/requests/highlights",
  "lesson-lock": "@/lib/requests/lesson-lock",
  lesson: "@/lib/requests/lesson",
  notes: "@/lib/requests/notes",
  "playlist-enrollment": "@/lib/requests/playlist-enrollment",
  playlist: "@/lib/requests/playlist",
  posthog: "@/lib/requests/posthog",
  tag: "@/lib/requests/tag",
  "user-activity": "@/lib/requests/user-activity",
  "voyage-enrollment": "@/lib/requests/voyage-enrollment",
  voyage: "@/lib/requests/voyage",
  // Outside callers named in the plan inventory; not part of the coverage scan.
  actions: "@/lib/actions",
  options: "@/lib/auth/options",
  "unclaimed-page": "@/app/(voyages)/v/[slug]/unclaimed/[nodeId]/page",
};

export const CAPTURED: Record<string, Call<never>[]> = {
  actions: defineModule<typeof import("@/lib/actions")>([
    call("fetchCreationRequests", (m) => m.fetchCreationRequests()),
    call("fetchCreationRequestByUser", (m) => m.fetchCreationRequestByUser(1)),
  ]),
  options: defineModule<typeof import("@/lib/auth/options")>([
    call("authOptions", (m) =>
      Promise.resolve(
        m.authOptions.callbacks?.jwt?.({
          token: {},
          user: { id: "1", email: EMAIL },
          account: { provider: "github" },
        } as never),
      ),
    ),
  ]),
  "unclaimed-page": defineModule<
    typeof import("@/app/(voyages)/v/[slug]/unclaimed/[nodeId]/page")
  >([
    call("default", (m) =>
      m.default({ params: Promise.resolve({ slug: SLUG, nodeId: "1" }) }),
    ),
  ]),
  "admin-stats": defineModule<typeof import("@/lib/requests/admin-stats")>([
    call("getAdminDashboardStats", (m) => m.getAdminDashboardStats()),
  ]),
  analytics: defineModule<typeof import("@/lib/requests/analytics")>([
    call("getRetentionData", (m) => m.getRetentionData()),
  ]),
  "authorized-user-roles": defineModule<
    typeof import("@/lib/requests/authorized-user-roles")
  >([
    call("getAuthorizedUserRoleIdByTitle", (m) =>
      m.getAuthorizedUserRoleIdByTitle(SLUG),
    ),
  ]),
  "authorized-user": defineModule<
    typeof import("@/lib/requests/authorized-user")
  >([
    call("getAuthorizedUserByEmail", (m) => m.getAuthorizedUserByEmail(EMAIL)),
    call("getAuthorizedUsersByEmails", (m) =>
      m.getAuthorizedUsersByEmails([EMAIL]),
    ),
    call("fetchAuthorizedUsers", (m) => m.fetchAuthorizedUsers()),
    call("searchAuthorizedUsers", (m) => m.searchAuthorizedUsers(SLUG)),
    call("fetchAuthorizedUsersMetadata", (m) =>
      m.fetchAuthorizedUsersMetadata(),
    ),
    call("fetchContentCreators", (m) => m.fetchContentCreators()),
    call("fetchWebsiteCreators", (m) => m.fetchWebsiteCreators()),
    call("fetchIsAuthorizedUser", (m) => m.fetchIsAuthorizedUser(EMAIL)),
    call("fetchContentEditors", (m) => m.fetchContentEditors()),
    call("resolveEmailsToUserIds", (m) => m.resolveEmailsToUserIds([EMAIL])),
    call(
      "updateUserInfo",
      (m) =>
        m.updateUserInfo(1, {
          first: "A",
          last: "B",
          bio: "bio",
          roles: ["Faculty"] as never,
          profilePhoto: "https://example.com/p.png",
          isEnabled: true,
          isPublic: true,
          firstTime: false,
          linkedin: "https://linkedin.com/in/x",
          github: "https://github.com/x",
          website: "https://example.com",
        }),
      routes([
        [
          "GET",
          /^\/authorized-user-roles$/,
          list(ent(7, { title: "Faculty" })),
        ],
      ]),
    ),
  ]),
  cached: defineModule<typeof import("@/lib/requests/cached")>([
    call("getCachedUser", (m) => m.getCachedUser(EMAIL)),
    call("getCachedUserSocial", (m) => m.getCachedUserSocial(EMAIL)),
    call("getCachedUserCreation", (m) => m.getCachedUserCreation(EMAIL)),
    call("getCachedEnrollments", (m) => m.getCachedEnrollments(1)),
    call("getCachedEnrollmentsWithLessonIds", (m) =>
      m.getCachedEnrollmentsWithLessonIds(1),
    ),
    call("getCachedEnrollmentsDashboard", (m) =>
      m.getCachedEnrollmentsDashboard(1),
    ),
    call("getCachedEnrollmentsFavorites", (m) =>
      m.getCachedEnrollmentsFavorites(1),
    ),
    call("getCachedUserDashboardFull", (m) =>
      m.getCachedUserDashboardFull(EMAIL),
    ),
    call("getCachedUserGroups", (m) => m.getCachedUserGroups(1)),
    call("getCachedUserDueDates", (m) => m.getCachedUserDueDates(1)),
    call("getCachedLessonBySlug", (m) => m.getCachedLessonBySlug(SLUG)),
    call("getCachedDraftDropletBySlug", (m) =>
      m.getCachedDraftDropletBySlug(SLUG),
    ),
    call("getCachedDraftDropletOptions", (m) =>
      m.getCachedDraftDropletOptions(),
    ),
    call("getCachedDropletBySlug", (m) => m.getCachedDropletBySlug(SLUG)),
    call("getCachedVoyageEnrollment", (m) => m.getCachedVoyageEnrollment(1, 1)),
    call("getCachedVoyageEnrollmentsByUser", (m) =>
      m.getCachedVoyageEnrollmentsByUser(1),
    ),
  ]),
  data: defineModule<typeof import("@/lib/requests/data")>([
    call("fetchDroplets", (m) => m.fetchDroplets()),
    call("fetchGroups", (m) => m.fetchGroups()),
    call("fetchAccessRequests", (m) => m.fetchAccessRequests()),
    call("fetchReports", (m) => m.fetchReports()),
  ]),
  dataset: defineModule<typeof import("@/lib/requests/dataset")>([
    call("getDatasetsByDropletId", (m) => m.getDatasetsByDropletId(1)),
  ]),
  "droplet-analytics": defineModule<
    typeof import("@/lib/requests/droplet-analytics")
  >([
    call("getDropletAnalytics", (m) =>
      m.getDropletAnalytics(1, [{ id: 1, name: "Sentinel" }]),
    ),
  ]),
  droplet: defineModule<typeof import("@/lib/requests/droplet")>([
    call("getDroplets", (m) => m.getDroplets()),
    call("getDropletBySlug", (m) => m.getDropletBySlug(SLUG)),
    call("getDropletById", (m) => m.getDropletById(1)),
    call("getDraftDroplets", (m) => m.getDraftDroplets()),
    call("getInReviewDroplets", (m) => m.getInReviewDroplets()),
    call("getRandomFunFactDroplet", (m) => m.getRandomFunFactDroplet()),
    call("getFavoritedDropletIds", (m) => m.getFavoritedDropletIds(1)),
    call("updateDroplet", (m) =>
      m.updateDroplet(
        1,
        {
          name: "Sentinel droplet",
          slug: SLUG,
          focusArea: "technical",
          type: "knowledge",
          difficulty: "beginner",
          isHidden: false,
          presentationEnabled: true,
          learningObjectives: ["Learn"],
          nextSteps: [{ label: "Next", url: "https://example.com" }],
          description: "d",
          overview: "o",
          authorized_users: [1],
          tagIds: [1],
          prerequisiteIds: [2],
          postrequisiteIds: [3],
          lessons: [{ id: 1 }],
          datasets: [1] as never,
          inReview: false,
          status: "draft",
          afterReview: "",
        },
        { regenerateSlug: false },
      ),
    ),
    call(
      "createDroplet",
      (m) =>
        m.createDroplet({
          name: "Sentinel droplet",
          focusArea: "technical",
          type: "knowledge",
          difficulty: "beginner",
          tagIds: [1],
          learningObjectives: ["Learn"],
        }),
      routes([ME_ROUTE]),
    ),
    call("duplicateDroplet", (m) => m.duplicateDroplet(1), DUPLICATE_DROPLET),
    call(
      "publishDraftToOriginal",
      (m) => m.publishDraftToOriginal(1, 2),
      PUBLISH_DRAFT,
    ),
    call(
      "favoriteDroplet",
      (m) => m.favoriteDroplet(DROPLET, true),
      routes([
        ME_ROUTE,
        [
          "GET",
          /^\/droplets\/doc1$/,
          { data: ent(1, { usersFavorited: rel(ent(9)) }) },
        ],
      ]),
    ),
  ]),
  enrollment: defineModule<typeof import("@/lib/requests/enrollment")>([
    call("getEnrollmentsByAuthorizedUser", (m) =>
      m.getEnrollmentsByAuthorizedUser(1),
    ),
    call("getEnrollmentsForGroupMembers", (m) =>
      m.getEnrollmentsForGroupMembers([1], [1]),
    ),
    call("getEnrollmentByUserAndDroplet", (m) =>
      m.getEnrollmentByUserAndDroplet(1, 1),
    ),
    call("getEnrollByID", (m) => m.getEnrollByID("1")),
    call("calculateDropletAverageRating", (m) =>
      m.calculateDropletAverageRating(DROPLET),
    ),
    call("fetchEnrollmentMetadata", (m) => m.fetchEnrollmentMetadata()),
    call(
      "createEnrollment",
      (m) => m.createEnrollment(DROPLET, [{ id: 1 }] as never),
      routes([ME_ROUTE]),
    ),
    call(
      "updateViewedLessons",
      (m) => m.updateViewedLessons("1", 2, [2, 3]),
      routes([
        ME_ROUTE,
        [
          "GET",
          /^\/enrollments$/,
          list(
            ent(1, {
              isComplete: false,
              viewedLessons: rel(),
              droplet: { data: ent(1, { lessons: rel(ent(2), ent(3)) }) },
              authorizedUser: { data: ent(1) },
            }),
          ),
        ],
      ]),
    ),
  ]),
  feed: defineModule<typeof import("@/lib/requests/feed")>([
    call("fetchAnnouncements", (m) => m.fetchAnnouncements(1, ["Student"])),
    call("getUnreadAnnouncementCount", (m) => m.getUnreadAnnouncementCount()),
    call("fetchAnnouncementById", (m) => m.fetchAnnouncementById(1)),
    call("fetchUserAnnouncements", (m) => m.fetchUserAnnouncements(1, 1)),
    call("createFriendAnnouncement", (m) =>
      m.createFriendAnnouncement(DROPLET, USER),
    ),
  ]),
  friends: defineModule<typeof import("@/lib/requests/friends")>([
    call("fetchFriends", (m) => m.fetchFriends(USER)),
    call("getSentRequestIds", (m) => m.getSentRequestIds(USER)),
    call("fetchFriendshipsById", (m) => m.fetchFriendshipsById(1)),
    call("fetchFriendshipsByUserIds", (m) => m.fetchFriendshipsByUserIds([1])),
    call("fetchSuggestionsById", (m) => m.fetchSuggestionsById(1)),
  ]),
  galleries: defineModule<typeof import("@/lib/requests/galleries")>([
    call("getGalleryBySlug", (m) => m.getGalleryBySlug(SLUG)),
  ]),
  groups: defineModule<typeof import("@/lib/requests/groups")>([
    call("getManagedGroups", (m) => m.getManagedGroups(1)),
    call("getGroupBySlug", (m) => m.getGroupBySlug(SLUG, 1)),
    call("getGroupByID", (m) => m.getGroupByID(1)),
    call("getUserGroups", (m) => m.getUserGroups(1)),
    call("getGroupBySlugV2", (m) => m.getGroupBySlugV2(SLUG)),
    call("getGroupDueDate", (m) => m.getGroupDueDate(DROPLET, GROUP)),
    call("getGroupDueDates", (m) => m.getGroupDueDates(GROUP)),
    call("getUserDueDates", (m) => m.getUserDueDates(1)),
    call("createGroup", (m) =>
      m.createGroup(1, {
        groupName: "Sentinel group",
        description: "d",
        semester: "Open Membership",
        initialMembers: { admins: [1], managers: [1], memberIds: [1] },
        droplets: [1],
        playlists: [1],
        voyages: [1],
      }),
    ),
    call("updateGroup", (m) =>
      m.updateGroup(1, {
        groupName: "Sentinel group",
        description: "d",
        semester: "Open Membership",
        isArchived: false,
        admins: [1],
        managers: [1],
        memberIds: [1],
        droplets: [{ id: 1 }],
        playlists: [{ id: 1 }],
        voyages: [{ id: 1 }],
      }),
    ),
    call(
      "assignDropletDueDate",
      (m) =>
        m.assignDropletDueDate(
          "2030-01-01",
          { ...(GROUP as object), members: [{ id: 1 }, { id: 2 }] } as never,
          DROPLET,
        ),
      routes([
        [
          "GET",
          /^\/due-dates$/,
          list(ent(50, { authorized_user: { data: ent(1) } })),
        ],
      ]),
    ),
  ]),
  highlights: defineModule<typeof import("@/lib/requests/highlights")>([
    call("getHighlights", (m) => m.getHighlights(1, "text")),
    call("createHighlight", (m) =>
      m.createHighlight({
        data: {
          text: "t",
          color: "yellow",
          position: { x: 1 },
          yLevel: 1.5,
          blockId: 1,
          lesson: 1,
          authorized_user: 1,
          note: 1,
        },
      }),
    ),
    call("getHighlightsByDroplet", (m) => m.getHighlightsByDroplet(1, 1)),
    call("getAllHighlightsByUser", (m) => m.getAllHighlightsByUser(1)),
    call("getHighlightsByAuthorizedUserAndLesson", (m) =>
      m.getHighlightsByAuthorizedUserAndLesson(1, SLUG),
    ),
  ]),
  lesson: defineModule<typeof import("@/lib/requests/lesson")>([
    call("getLessonBySlug", (m) => m.getLessonBySlug(SLUG)),
    call("updateLesson", (m) =>
      m.updateLesson(
        1,
        {
          name: "Sentinel lesson",
          slug: SLUG,
          blocks: [QUIZ_BLOCK, GENERIC_BLOCK] as never,
          blocksV2: [{ type: "paragraph", content: "x" }],
          blocksVersion: "v1",
          orderIndex: 0,
        },
        { regenerateSlug: false },
      ),
    ),
    call("addLesson", (m) =>
      m.addLesson({
        name: "Sentinel lesson",
        dropletId: 1,
        orderIndex: 1,
        blocksV2: [{ type: "paragraph", content: "x" }],
        blocksVersion: "v2",
      }),
    ),
    call(
      "duplicateLessonToDroplet",
      (m) => m.duplicateLessonToDroplet(5, 1, 3),
      routes([["GET", /^\/lessons\/doc5$/, { data: lessonEnt(5, "v1") }]]),
    ),
    call(
      "duplicateLessonToDroplet",
      (m) => m.duplicateLessonToDroplet(6, 1, 4),
      routes([["GET", /^\/lessons\/doc6$/, { data: lessonEnt(6, "v2") }]]),
    ),
  ]),
  notes: defineModule<typeof import("@/lib/requests/notes")>([
    call("getNotesByAuthorizedUserAndLesson", (m) =>
      m.getNotesByAuthorizedUserAndLesson(1, SLUG),
    ),
    call("getNotesByDroplet", (m) => m.getNotesByDroplet(1, 1)),
    call("getAllNotesByUser", (m) => m.getAllNotesByUser(1)),
    call("createNote", (m) =>
      m.createNote(
        { id: 1 } as never,
        { id: 1 } as never,
        10,
        1,
        { id: 1 } as never,
        "c",
      ),
    ),
  ]),
  playlist: defineModule<typeof import("@/lib/requests/playlist")>([
    call("getPlaylists", (m) => m.getPlaylists()),
    call("getPlaylistBySlug", (m) => m.getPlaylistBySlug(SLUG)),
    call("getPlaylistById", (m) => m.getPlaylistById(1)),
    call("updatePlaylist", (m) =>
      m.updatePlaylist(1, {
        name: "Sentinel playlist",
        description: "d",
        isPublic: true,
        droplets: [{ id: 1 }],
        slug: SLUG,
      }),
    ),
    call("createPlaylist", (m) =>
      m.createPlaylist({
        name: "Sentinel playlist",
        isPublic: true,
        description: "d",
        droplets: [{ id: 1 }],
        author: { id: 1 },
        userId: 1,
      }),
    ),
  ]),
  tag: defineModule<typeof import("@/lib/requests/tag")>([
    call("getTags", (m) => m.getTags()),
    call("getTagBySlug", (m) => m.getTagBySlug(SLUG)),
  ]),
  voyage: defineModule<typeof import("@/lib/requests/voyage")>([
    call("getVoyages", (m) => m.getVoyages()),
    call("getVoyagesAdmin", (m) => m.getVoyagesAdmin()),
    call("getVoyageBySlug", (m) => m.getVoyageBySlug(SLUG)),
    call("getArchivedVoyagesForAuthor", (m) =>
      m.getArchivedVoyagesForAuthor(1),
    ),
    call("createVoyageWithNodes", (m) =>
      m.createVoyageWithNodes({
        name: "Sentinel voyage",
        description: "d",
        status: "draft",
        isSequential: true,
        authorId: 1,
        nodes: [
          {
            localId: "a",
            nodeType: "playlist",
            playlistId: 1,
            dropletId: null,
            label: "Main playlist",
            isMainPath: true,
            branchType: "required",
            parentLocalId: null,
            orderIndex: 0,
          },
          {
            localId: "b",
            nodeType: "droplet",
            playlistId: null,
            dropletId: null,
            label: "Placeholder",
            isMainPath: true,
            branchType: "required",
            parentLocalId: null,
            orderIndex: 1,
          },
          {
            localId: "c",
            nodeType: "droplet",
            playlistId: null,
            dropletId: 1,
            label: "Branch",
            isMainPath: false,
            branchType: "optional",
            parentLocalId: "a",
            orderIndex: 0,
          },
        ],
      }),
    ),
  ]),
  "voyage-enrollment": defineModule<
    typeof import("@/lib/requests/voyage-enrollment")
  >([
    call("getVoyageEnrollment", (m) => m.getVoyageEnrollment(1, 1)),
    call("getVoyageEnrollmentsByUser", (m) => m.getVoyageEnrollmentsByUser(1)),
    call("getVoyageEnrollmentsForGroupMembers", (m) =>
      m.getVoyageEnrollmentsForGroupMembers([1], [1]),
    ),
    call("getVoyageNodeCompletions", (m) => m.getVoyageNodeCompletions(1, 1)),
    call(
      "claimNodeForUser",
      (m) => m.claimNodeForUser(1, 1),
      routes([
        [
          "GET",
          /^\/voyage-nodes$/,
          list(
            ent(1, {
              label: "Node",
              nodeType: "droplet",
              claimStatus: "unclaimed",
              voyage: { data: ent(1, { name: "Voyage" }) },
            }),
          ),
        ],
      ]),
    ),
  ]),
};

const WRITE = "write: not in curated set";

/** Exports that make no captured Strapi call, with the reason. */
export const SKIPPED: Record<string, Record<string, string>> = {
  "authorized-user": {
    createAuthorizedUser: WRITE,
    createBatchAuthorizedUsers: WRITE,
    deleteAuthorizedUser: WRITE,
  },
  dataset: { createDataset: WRITE, deleteDataset: WRITE },
  droplet: {
    updateDropletAverageRating: WRITE,
    updateDropletFunFact: WRITE,
    deepDeleteDroplet: WRITE,
    togglePresentationEnabled: WRITE,
    archiveDroplet: WRITE,
    setDropletHidden: WRITE,
    createNewTag: WRITE,
    updateDropletLearningObjective: WRITE,
  },
  enrollment: {
    changeEnrollmentRating: WRITE,
    updateEnrollmentFirstTime: WRITE,
    createEnrollmentFromEmail: WRITE,
    deleteEnrollment: WRITE,
    recordMissingCompletion: WRITE,
    updateCompletionDate: WRITE,
    createEnrollmentDirect: WRITE,
  },
  feed: {
    createKudosAnnouncement: WRITE,
    createPlaylistAnnouncement: WRITE,
    createGroupAnnouncement: WRITE,
    createDropletAnnouncement: WRITE,
    createSystemAnnouncement: WRITE,
    createSystemBroadcast: WRITE,
    markAnnouncementRead: WRITE,
    markAnnouncementUnread: WRITE,
  },
  friends: {
    acceptFriendRequest: WRITE,
    sendFriendRequest: WRITE,
    rejectFriendRequest: WRITE,
    cancelFriendRequest: WRITE,
    unblockUser: WRITE,
    BlockUser: WRITE,
    removeFriend: WRITE,
  },
  groups: {
    refreshUserGroups: WRITE,
    updateGroupMembers: WRITE,
    addGroupMembers: WRITE,
    removeGroupMembers: WRITE,
    changeGroupMemberRole: WRITE,
    enrollUsers: WRITE,
    assignPlaylistDueDate: WRITE,
    deleteGroup: WRITE,
    archiveGroup: WRITE,
  },
  highlights: { deleteHighlight: WRITE },
  "lesson-lock": {
    getCurrentAuthorizedUserId:
      "delegates to getAuthorizedUserByEmail (captured)",
    acquireLessonLock: "custom lock routes (plan V7)",
    releaseLessonLock: "custom lock routes (plan V7)",
    heartbeatLessonLock: "custom lock routes (plan V7)",
    getLessonLockStatus: "custom lock routes (plan V7)",
  },
  lesson: {
    markLessonAsComplete: WRITE,
    completeLesson: "dead endpoint (plan R5); no such content type",
    deleteLesson: WRITE,
    revalidateLesson: "cache revalidation only, no Strapi call",
  },
  notes: {
    updateNoteContent: WRITE,
    updateNotePosition: WRITE,
    deleteNote: WRITE,
  },
  "playlist-enrollment": {
    togglePlaylistEnrollment: WRITE,
    enrollInPlaylist: WRITE,
  },
  playlist: {
    deletePlaylist: WRITE,
    archivePlaylist: WRITE,
  },
  posthog: {
    fetchDailyActiveUsers: "PostHog only, no Strapi",
    fetchWeeklyActiveUsers: "PostHog only, no Strapi",
    fetchUniquePageview: "PostHog only, no Strapi",
    fetchWeeklyNewUsers: "PostHog only, no Strapi",
    fetchLessonScrollDepth: "PostHog only, no Strapi",
    fetchAvgSessionDuration: "PostHog only, no Strapi",
  },
  "user-activity": { getUserActivity: "PostHog only, no Strapi" },
  voyage: {
    publishVoyage: WRITE,
    updateVoyageWithNodes: WRITE,
    deleteVoyage: WRITE,
    archiveVoyage: WRITE,
  },
  "voyage-enrollment": {
    enrollInVoyage: WRITE,
    enrollInVoyageDirect: WRITE,
    unenrollFromVoyage: WRITE,
    markVoyageNodeComplete: WRITE,
    checkAndCompleteVoyageNode: WRITE,
    checkDropletVoyageNode: WRITE,
    claimVoyageDropletNode: WRITE,
    unclaimVoyageDropletNode: WRITE,
  },
};
