import type { DropletStatus } from "@/types";

type AccessDroplet = {
  status?: DropletStatus | null;
  isHidden?: boolean | null;
  lessons?: { id: number }[] | null;
};

export type LessonAccess = { ok: false } | { ok: true; mentor: boolean };

/**
 * Whether a signed-in user may open this lesson under this droplet, and
 * whether Mentor answers there. The lesson page and Mentor's route
 * (ODY-886) both decide with this, so they can't drift.
 *
 * Today the only rule is that the lesson belongs to the droplet. ODY-660
 * adds its visibility gate for hidden and unpublished droplets here.
 *
 * Mentor runs only on published, visible droplets, for everyone, authors
 * included. A droplet in `edit` isn't live.
 */
export function lessonAccess(
  droplet: AccessDroplet,
  lessonId: number,
): LessonAccess {
  if (!droplet.lessons?.some((lesson) => lesson.id === lessonId)) {
    return { ok: false };
  }
  return {
    ok: true,
    mentor: droplet.status === "published" && !droplet.isHidden,
  };
}
