import { DateTime } from "luxon";
import type { ReminderFeedData } from "@/types";

type LessonRef = { id: number; name: string; slug: string; orderIndex: number };
type DueRow = { dueDate: string; group?: { groupName?: string } | null };

const FALLBACK_HEADLINE = (droplet: string) =>
  `Pick up ${droplet} where you left off.`;

/** The card headline for a droplet and how much of it is left. */
export function reminderHeadline(
  droplet: string,
  progress: { viewed: number; total: number } | null,
): string {
  if (progress && progress.total - progress.viewed === 1) {
    return `You're one lesson away from finishing ${droplet}!`;
  }
  return FALLBACK_HEADLINE(droplet);
}

/** Progress and the first unviewed lesson, in droplet order. */
export function reminderProgress(
  lessons: LessonRef[],
  viewedLessonIds: number[],
): Pick<ReminderFeedData, "progress" | "nextLesson" | "started"> {
  const sorted = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const viewed = new Set(viewedLessonIds);
  const viewedCount = sorted.filter((l) => viewed.has(l.id)).length;
  const next = sorted.find((l) => !viewed.has(l.id));
  return {
    progress: sorted.length
      ? { viewed: viewedCount, total: sorted.length }
      : null,
    nextLesson: next ? { name: next.name, slug: next.slug } : null,
    started: viewedCount > 0,
  };
}

/** The earliest due date among a learner's rows for one droplet. */
export function earliestDue(rows: DueRow[]): {
  dueDate: string;
  dueGroupName?: string;
} | null {
  const first = [...rows].sort(
    (a, b) =>
      DateTime.fromISO(a.dueDate).toMillis() -
      DateTime.fromISO(b.dueDate).toMillis(),
  )[0];
  return first
    ? { dueDate: first.dueDate, dueGroupName: first.group?.groupName }
    : null;
}

/** Due chip text, or null when the date is more than 3 calendar days away. */
export function dueChipText(
  dueDate: string,
  groupName?: string,
  now: DateTime = DateTime.local(),
): string | null {
  const due = DateTime.fromISO(dueDate, { zone: now.zone });
  const days = Math.ceil(
    due.startOf("day").diff(now.startOf("day"), "days").days,
  );
  if (days > 3) return null;
  const when =
    days < 0
      ? days === -1
        ? "One Day Late!"
        : `${Math.abs(days)} Days Late!`
      : days === 0
        ? "Due today"
        : days === 1
          ? "Due tomorrow"
          : `Due ${due.toFormat("ccc")}`;
  return groupName ? `${when} · ${groupName}` : when;
}
