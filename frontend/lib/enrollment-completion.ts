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
