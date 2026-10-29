import { fetchAPI } from "@/lib/utils";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";
import type { DropletSnapshot, SnapshotLesson } from "./types";

type Objective = { objective?: string | null };
type RawLesson = SnapshotLesson & { orderIndex?: number | null };
type RawDroplet = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  type?: string | null;
  focusArea?: string | null;
  difficulty?: string | null;
  overview?: string | null;
  afterReview?: string | null;
  learningObjectives?: Objective[] | null;
  prerequisites?:
    | {
        name: string;
        description?: string | null;
        learningObjectives?: Objective[] | null;
      }[]
    | null;
  lessons?: RawLesson[] | null;
};

const objectives = (list?: Objective[] | null) =>
  (list ?? []).map((o) => o.objective?.trim()).filter((o): o is string => !!o);

/**
 * Reads a droplet, with every lesson in order and the details scoring needs,
 * as it is right now (never from cache). Shared by Score with AI (ODY-814)
 * and the eval scripts (ODY-813). Null when there is no such droplet.
 *
 * `previousReview` reads the old `afterReview` text for the eval fixtures.
 * Score with AI leaves it out, so it keeps working once ODY-808 deletes the
 * field.
 */
export async function fetchDropletSnapshot(
  ref: { id: number } | { slug: string },
  { previousReview = true }: { previousReview?: boolean } = {},
): Promise<DropletSnapshot | null> {
  const rows = await fetchAPI<RawDroplet[] | null>("/droplets", {
    urlParams: {
      filters:
        "id" in ref ? { id: { $eq: ref.id } } : { slug: { $eq: ref.slug } },
      fields: [
        "name",
        "slug",
        "description",
        "type",
        "focusArea",
        "difficulty",
        "overview",
        ...(previousReview ? ["afterReview"] : []),
      ],
      populate: {
        learningObjectives: true,
        prerequisites: {
          fields: ["name", "description"],
          populate: { learningObjectives: true },
        },
        lessons: {
          fields: ["name", "type", "blocksVersion", "blocksV2", "orderIndex"],
          sort: ["orderIndex:asc"],
          populate: LESSON_BLOCKS_POPULATE,
        },
      },
      pagination: { pageSize: 1 },
    },
    cache: "no-store",
  });
  const raw = rows?.[0];
  return raw ? toSnapshot(raw) : null;
}

function toSnapshot(raw: RawDroplet): DropletSnapshot {
  const lessons = [...(raw.lessons ?? [])].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
  );
  return {
    snapshotVersion: 1,
    takenAt: new Date().toISOString(),
    source: {
      strapiUrl: process.env.NEXT_PUBLIC_STRAPI_API_URL ?? "",
      dropletId: raw.id,
    },
    droplet: {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description ?? null,
      type: raw.type ?? null,
      focusArea: raw.focusArea ?? null,
      difficulty: raw.difficulty ?? null,
      learningObjectives: objectives(raw.learningObjectives),
      overview: raw.overview ?? null,
      prerequisites: (raw.prerequisites ?? []).map((p) => ({
        name: p.name,
        description: p.description ?? null,
        learningObjectives: objectives(p.learningObjectives),
      })),
      previousReview: raw.afterReview?.trim() || null,
    },
    lessons: lessons.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type ?? null,
      blocksVersion: l.blocksVersion ?? null,
      blocks: l.blocks ?? null,
      blocksV2: l.blocksV2 ?? null,
    })),
  };
}
