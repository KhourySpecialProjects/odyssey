import "server-only";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getLearnerProfile } from "@/lib/learner-profile";
import { getCoCompletion } from "@/lib/recommendations/co-completion";
import { getDismissedDropletIds } from "@/lib/recommendations/dismissals";
import { voyageDropletIds } from "@/lib/recommendations/rules";
import type {
  CandidateDroplet,
  LearningPath,
  RankInput,
  StudentState,
  VoyageNodeInput,
} from "@/lib/recommendations/rules";
import { getDroplets } from "@/lib/requests/droplet";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import { fetchAPI } from "@/lib/utils";

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

// Trusts the user id it's given: pass the session user. Never a "use server" file.

type VoyageEnrollmentRow = {
  voyage?: {
    name: string;
    status: string;
    isArchived?: boolean | null;
    voyage_nodes?: VoyageNodeInput[] | null;
  } | null;
};
type PlaylistRow = {
  name: string;
  isArchived?: boolean | null;
  droplets?: { id: number }[] | null;
  users_archived?: { id: number }[] | null;
};

/** Resolves to `fallback` when an optional read fails; logs only the label and error name. */
async function optional<T>(
  label: string,
  promise: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(
      `recommendations: ${label} read failed:`,
      (error as Error)?.name,
    );
    return fallback;
  }
}

/** Reads pages of PAGE_SIZE until a short page; throws past MAX_PAGES so nothing is silently cut off. */
async function readAllPages<T>(
  read: (pagination: { page: number; pageSize: number }) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = (await read({ page, pageSize: PAGE_SIZE })) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  throw new RangeError("page limit reached");
}

/** Every live droplet, the same requests for every student. */
export async function getCandidates(): Promise<CandidateDroplet[]> {
  return readAllPages(
    (pagination) =>
      getDroplets({
        filters: {
          $and: [
            { status: { $eq: "published" } },
            { isHidden: false },
            { lessons: { id: { $notNull: true } } },
          ],
        },
        fields: [
          "name",
          "slug",
          "type",
          "focusArea",
          "difficulty",
          "description",
          "averageRating",
        ],
        populate: {
          lessons: { fields: ["id"] },
          tags: { fields: ["name", "slug"] },
          authorized_users: USER_POPULATES.authorName,
          prerequisites: { fields: ["id"] },
        },
        sort: ["id:asc"],
        pagination,
      }) as Promise<CandidateDroplet[]>,
  );
}

const getVoyageRows = (userId: number) =>
  fetchAPI<VoyageEnrollmentRow[] | null>("/voyage-enrollments", {
    urlParams: {
      filters: { authorizedUser: { id: { $eq: userId } } },
      fields: ["enrolledAt"],
      sort: ["enrolledAt:desc", "id:desc"],
      pagination: { page: 1, pageSize: 100 },
      populate: {
        voyage: {
          fields: ["name", "status", "isArchived"],
          populate: {
            voyage_nodes: {
              fields: ["orderIndex", "isMainPath", "branchType", "nodeType"],
              populate: {
                droplet: { fields: ["id"] },
                playlist: {
                  fields: ["id"],
                  populate: { droplets: { fields: ["id"] } },
                },
                parentNode: { fields: ["id"] },
              },
            },
          },
        },
      },
    },
    next: {
      tags: [
        CACHE_TAGS.voyageEnrollments(userId),
        CACHE_TAGS.voyages,
        CACHE_TAGS.playlists,
        CACHE_TAGS.recommendations(userId),
      ],
      revalidate: 900,
    },
  });

const getPlaylistRows = (userId: number) =>
  fetchAPI<PlaylistRow[] | null>("/playlists", {
    urlParams: {
      filters: { authorized_users: { id: { $eq: userId } } },
      fields: ["name", "isArchived"],
      sort: ["id:asc"],
      pagination: { page: 1, pageSize: 100 },
      populate: {
        droplets: { fields: ["id"] },
        users_archived: { fields: ["id"], filters: { id: { $eq: userId } } },
      },
    },
    next: {
      tags: [
        CACHE_TAGS.playlists,
        CACHE_TAGS.enrollments(userId),
        CACHE_TAGS.recommendations(userId),
      ],
      revalidate: 900,
    },
  });

/** Everything personal to one student, normalised for the rules. */
export async function getStudentState(userId: number): Promise<StudentState> {
  const [enrollments, voyages, playlists, profile, dismissed] =
    await Promise.all([
      readAllPages((pagination) =>
        getEnrollmentsByAuthorizedUser(userId, {
          fields: ["isComplete", "completionDate"],
          populate: { droplet: { fields: ["name"] } },
          pagination,
        }),
      ),
      optional("voyages", getVoyageRows(userId), []),
      optional("playlists", getPlaylistRows(userId), []),
      optional("profile", getLearnerProfile(userId), null),
      getDismissedDropletIds(userId),
    ]);

  const rows = enrollments.filter((e) => e.droplet);
  const finished = rows
    .filter((e) => e.isComplete)
    .map((e) => ({
      id: e.droplet!.id,
      name: e.droplet!.name,
      at: new Date(e.completionDate ?? 0).getTime() || 0,
    }))
    .sort((a, b) => b.at - a.at || b.id - a.id);

  const voyagePaths: LearningPath[] = (voyages ?? []).flatMap(({ voyage }) =>
    voyage && voyage.status === "published" && !voyage.isArchived
      ? [
          {
            rule: "next-in-voyage" as const,
            name: voyage.name,
            dropletIds: voyageDropletIds(voyage.voyage_nodes ?? []),
          },
        ]
      : [],
  );
  const playlistPaths: LearningPath[] = (playlists ?? []).flatMap((p) =>
    p.isArchived !== true && !p.users_archived?.length
      ? [
          {
            rule: "next-in-playlist" as const,
            name: p.name,
            dropletIds: (p.droplets ?? []).map((d) => d.id),
          },
        ]
      : [],
  );

  return {
    userId,
    enrolledIds: new Set(rows.map((e) => e.droplet!.id)),
    finished,
    paths: [...voyagePaths, ...playlistPaths],
    interests: profile?.interests.map(({ id, name }) => ({ id, name })) ?? [],
    focusAreas: profile?.focusAreas ?? [],
    dismissedIds: new Set(dismissed),
  };
}

export async function getRankInput(
  userId: number,
  excludeIds: number[],
): Promise<RankInput> {
  const [candidates, student, { pairs, completions }] = await Promise.all([
    getCandidates(),
    getStudentState(userId),
    optional("co-completion", getCoCompletion(), {
      pairs: new Map(),
      completions: new Map(),
    }),
  ]);
  return {
    candidates,
    student,
    excludeIds,
    coCompletion: pairs,
    completions,
  };
}
