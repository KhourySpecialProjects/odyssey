import type {
  CandidateDroplet,
  StudentState,
  VoyageNodeInput,
} from "@/lib/recommendations/rules";

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
