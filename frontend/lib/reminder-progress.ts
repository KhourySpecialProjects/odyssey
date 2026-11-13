import { DateTime } from "luxon";
import type { ReminderFeedData } from "@/types";
import { REMINDER_RULES } from "@/lib/reminder-rules";

type LessonRef = { id: number; name: string; slug: string; orderIndex: number };
type DueRow = { dueDate: string | null; group?: { groupName?: string } | null };

export type ReminderTemplateState = {
  progress: { viewed: number; total: number } | null;
  started: boolean;
  dueInDays: number | null;
  idleDays: number | null;
  /** Calendar days since enrolling, for "{when}" */
  enrollmentAgeDays?: number | null;
  /** The learner's today (YYYY-MM-DD), for the due weekday */
  today?: string;
};

export type ReminderTemplate =
  | "due_soon_started"
  | "due_soon_not_started"
  | "not_started"
  | "one_left"
  | "long_gap"
  | "halfway"
  | "fallback";

/** The template for a state; the first match wins. */
export function reminderTemplate(
  state: ReminderTemplateState,
): ReminderTemplate {
  const { progress, started, dueInDays, idleDays } = state;
  if (!progress) return "fallback";
  if (
    dueInDays !== null &&
    dueInDays >= 0 &&
    dueInDays <= REMINDER_RULES.dueSoonDays
  ) {
    return started ? "due_soon_started" : "due_soon_not_started";
  }
  if (!started) return "not_started";
  if (progress.total - progress.viewed === 1) return "one_left";
  if (idleDays !== null && idleDays >= REMINDER_RULES.longGapDays) {
    return "long_gap";
  }
  if (progress.viewed / progress.total >= REMINDER_RULES.halfway) {
    return "halfway";
  }
  return "fallback";
}

const dueDay = (state: ReminderTemplateState) => {
  const days = state.dueInDays ?? 0;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  const base = state.today ?? (DateTime.local().toISODate() as string);
  return DateTime.fromISO(base, { zone: "utc" })
    .plus({ days })
    .toFormat("cccc");
};

const enrolledWhen = (age: number | null | undefined) => {
  if (age == null || age < 4) return "recently";
  if (age < 7) return "a few days ago";
  if (age < 14) return "last week";
  return `${Math.floor(age / 7)} weeks ago`;
};

/** The card headline for a droplet in a given state. */
export function reminderHeadline(
  droplet: string,
  state: ReminderTemplateState,
): string {
  switch (reminderTemplate(state)) {
    case "due_soon_started":
      return `${droplet} is due ${dueDay(state)}. You've already started, so keep going!`;
    case "due_soon_not_started":
      return `${droplet} is due ${dueDay(state)}. Lesson 1 is a good place to start.`;
    case "not_started":
      return `You enrolled in ${droplet} ${enrolledWhen(state.enrollmentAgeDays)}. Ready when you are!`;
    case "one_left":
      return `You're one lesson away from finishing ${droplet}!`;
    case "long_gap":
      return `Welcome back! Pick up ${droplet} where you left off.`;
    case "halfway":
      return `You're over halfway through ${droplet}. Keep it going!`;
    default:
      return `Pick up ${droplet} where you left off.`;
  }
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
  // Cleared group dates arrive as null rows; skip anything unparseable
  const first = rows
    .filter(
      (r): r is DueRow & { dueDate: string } =>
        !!r.dueDate && DateTime.fromISO(r.dueDate).isValid,
    )
    .sort(
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
  if (days > REMINDER_RULES.dueSoonDays) return null;
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
