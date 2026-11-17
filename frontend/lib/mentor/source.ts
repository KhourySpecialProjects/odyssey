import "server-only";
import { objectives } from "@/lib/ai-review/droplet-snapshot";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";
import { fetchAPI } from "@/lib/utils";
import type { DropletStatus } from "@/types";
import type { MentorDroplet, MentorLesson } from "./types";

type RawDroplet = {
  name: string;
  difficulty?: string | null;
  status?: DropletStatus | null;
  isHidden?: boolean | null;
  learningObjectives?: { objective?: string | null }[] | null;
  lessons?: MentorLesson[] | null;
};

export type MentorSource = {
  /** What Mentor's prompt reads, plus what `lessonAccess` decides with */
  droplet: MentorDroplet & {
    status: DropletStatus | null;
    isHidden: boolean;
    lessons: { id: number }[];
  };
  /** Null when the lesson isn't in the droplet */
  lesson: MentorLesson | null;
};

/**
 * The droplet and one of its lessons, by numeric ids, for Mentor's route
 * (ODY-886). Cached with the lesson page's tags, so Mentor reads the version
 * the student sees and its citations match the screen; publishing
 * revalidates both. Null when there's no such droplet.
 *
 * The lesson holds quiz answers, so this stays out of "use server" files,
 * whose exports are public endpoints.
 */
export async function getMentorSource(
  dropletId: number,
  lessonId: number,
): Promise<MentorSource | null> {
  const rows = await fetchAPI<RawDroplet[] | null>("/droplets", {
    urlParams: {
      filters: { id: { $eq: dropletId } },
      fields: ["name", "difficulty", "status", "isHidden"],
      populate: {
        learningObjectives: true,
        lessons: {
          filters: { id: { $eq: lessonId } },
          fields: ["name", "blocksVersion", "blocksV2"],
          populate: LESSON_BLOCKS_POPULATE,
        },
      },
      pagination: { pageSize: 1, page: 1 },
    },
    next: { tags: [CACHE_TAGS.droplets, CACHE_TAGS.lesson], revalidate: 900 },
  });
  const raw = rows?.[0];
  if (!raw) return null;
  // Matched by id too, so an ignored populate filter can't pick another lesson
  const lesson = raw.lessons?.find((l) => l.id === lessonId) ?? null;
  return {
    droplet: {
      name: raw.name,
      difficulty: raw.difficulty ?? null,
      learningObjectives: objectives(raw.learningObjectives),
      status: raw.status ?? null,
      // Fails closed: a droplet whose flag didn't come back counts as hidden
      isHidden: raw.isHidden ?? true,
      lessons: lesson ? [{ id: lesson.id }] : [],
    },
    lesson,
  };
}
