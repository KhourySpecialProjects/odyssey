import type { Enrollment, EnrollmentWithDroplet } from "@/types";

/**
 * Whether an enrollment is missing completion data it should have: every
 * lesson viewed but not marked complete or without a completionDate, or
 * marked complete (e.g. by rating) without a completionDate.
 *
 * Shared by the lesson/recap pages (to decide whether to render
 * <CompletionBackfill>) and the recordMissingCompletion Server Action.
 */
export function needsCompletionBackfill(
  isComplete: boolean | null | undefined,
  completionDate: Date | string | null | undefined,
  allLessonsViewed: boolean,
): boolean {
  return (!!isComplete || allLessonsViewed) && (!isComplete || !completionDate);
}

type EnrollmentProgress = {
  isComplete?: boolean | null;
  completionDate?: Date | string | null;
  viewedLessons?: { id: number }[] | null;
  droplet?: { lessons?: { id: number }[] | null } | null;
};

/** needsCompletionBackfill for an enrollment with viewedLessons and droplet.lessons ids. */
export function enrollmentNeedsCompletionBackfill(
  enrollment: EnrollmentProgress,
): boolean {
  const viewed = new Set((enrollment.viewedLessons ?? []).map((l) => l.id));
  const lessons = enrollment.droplet?.lessons ?? [];
  const allViewed =
    lessons.length > 0 && lessons.every((l) => viewed.has(l.id));
  return needsCompletionBackfill(
    enrollment.isComplete,
    enrollment.completionDate,
    allViewed,
  );
}

/**
 * Percent (0-100) of the droplet's lessons this enrollment has viewed. Counts
 * only viewed lessons still in the droplet, like the lesson sidebar, so stray
 * viewedLessons links can't push it past 100. A droplet with no lessons is 0.
 */
export function enrollmentProgressPercent(
  enrollment: EnrollmentProgress,
): number {
  const lessonIds = new Set(
    (enrollment.droplet?.lessons ?? []).map((l) => l.id),
  );
  if (lessonIds.size === 0) return 0;
  const viewed = new Set(
    (enrollment.viewedLessons ?? [])
      .map((l) => l.id)
      .filter((id) => lessonIds.has(id)),
  );
  return (viewed.size / lessonIds.size) * 100;
}

/** Type guard that drops enrollments whose droplet is null (unpublished or deleted). */
export function hasDroplet(e: Enrollment): e is EnrollmentWithDroplet {
  return e.droplet != null;
}
