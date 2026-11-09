import { isAuthorizedUserAdmin } from "@/lib/utils";
import type { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { Lesson } from "@/types";

export type LessonGate = "enroll" | "locked" | "open";

function previousLessonOf(
  lessons: Lesson[] | undefined,
  lessonId: number,
): Lesson | undefined {
  const order = (lessons ?? []).find((l) => l.id === lessonId)?.orderIndex;
  if (order == null) return undefined;
  return (lessons ?? []).find((l) => l.orderIndex === order - 1);
}

/**
 * Whether a viewer sees the lesson, an enroll prompt or a lock notice.
 * `previous` is the lesson that unlocks this one; only meaningful when locked.
 */
export function lessonGate({
  lessonId,
  lessons,
  enrollmentId,
  completedLessonIds,
  author,
  roles,
}: {
  lessonId: number;
  lessons?: Lesson[];
  enrollmentId?: string;
  completedLessonIds: number[];
  author: boolean;
  roles?: AuthorizedUserRoleTitle[] | null;
}): { gate: LessonGate; previous?: Lesson } {
  const isAdmin = isAuthorizedUserAdmin(roles);
  if (!enrollmentId && !author && !isAdmin) return { gate: "enroll" };
  const previous = previousLessonOf(lessons, lessonId);
  if (
    previous &&
    !completedLessonIds.includes(previous.id) &&
    !author &&
    !isAdmin
  ) {
    return { gate: "locked", previous };
  }
  return { gate: "open" };
}
