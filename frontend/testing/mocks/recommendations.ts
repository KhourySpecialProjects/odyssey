import { REASONS } from "@/lib/recommendations/reasons";
import type {
  CandidateDroplet,
  StudentState,
  VoyageNodeInput,
} from "@/lib/recommendations/rules";
import type { Recommendation } from "@/types";

export const candidateDroplet = (
  overrides: Partial<CandidateDroplet> & { id: number },
): CandidateDroplet =>
  ({
    documentId: `doc-${overrides.id}`,
    name: `Droplet ${overrides.id}`,
    slug: `d-${overrides.id}`,
    focusArea: "technical",
    averageRating: 0,
    tags: [],
    lessons: [{ id: 1 }],
    authorized_users: [],
    prerequisites: [],
    ...overrides,
  }) as CandidateDroplet;

/** A ranked pick as getRecommendations returns it. */
export const recommendation = (
  droplet: Partial<CandidateDroplet> & { id: number },
  overrides: Partial<Omit<Recommendation, "droplet">> = {},
): Recommendation => ({
  droplet: candidateDroplet(droplet),
  reason: REASONS.topRated,
  rule: "popular",
  ...overrides,
});

export const studentState = (
  overrides: Partial<StudentState> = {},
): StudentState => ({
  userId: 7,
  enrolledIds: new Set(),
  finished: [],
  paths: [],
  interests: [],
  focusAreas: [],
  dismissedIds: new Set(),
  ...overrides,
});

export const voyageNode = (
  overrides: Partial<VoyageNodeInput> & { id: number },
): VoyageNodeInput => ({
  orderIndex: overrides.id,
  isMainPath: true,
  branchType: "required",
  nodeType: "droplet",
  droplet: null,
  playlist: null,
  parentNode: null,
  ...overrides,
});

/** A voyage-enrollment row as the engine's voyage read returns it (flat). */
export const voyageEnrollmentRow = (
  overrides: Record<string, unknown> = {},
) => ({
  voyage: {
    name: "V",
    status: "published",
    isArchived: false,
    voyage_nodes: [voyageNode({ id: 1, droplet: { id: 10 } })],
    ...overrides,
  },
});

/** A playlist row as the engine's playlist read returns it (flat). */
export const playlistRow = (overrides: Record<string, unknown> = {}) => ({
  name: "P",
  isArchived: false,
  droplets: [{ id: 20 }],
  users_archived: [],
  ...overrides,
});

/** An enrollment row as the engine's enrollment read returns it (flat). */
export const enrollmentRow = (
  dropletId: number,
  overrides: Record<string, unknown> = {},
) => ({
  isComplete: false,
  isArchived: false,
  completionDate: null,
  droplet: { id: dropletId, name: `Droplet ${dropletId}` },
  ...overrides,
});
