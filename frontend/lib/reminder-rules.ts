import { DateTime } from "luxon";
import { localDate, streakTimeZone } from "@/lib/streaks";
import type { ReminderTemplateState } from "@/lib/reminder-progress";

// ODY-931: pure rules deciding which droplet, if any, gets a reminder today.

/** Every threshold the reminder rules and templates use. */
export const REMINDER_RULES = {
  waitDays: 4,
  dueSoonDays: 3,
  gapDays: 7,
  maxSinceProgress: 3,
  staleAfterDays: 60,
  longGapDays: 21,
  halfway: 0.5,
} as const;

export type ReminderState = {
  lastRaisedAt: string | null;
  count: number | null;
  snoozedUntil: string | null;
  muted: boolean;
};

export type ReminderCandidate = {
  enrollmentId: number;
  dropletId: number;
  dropletName: string;
  enrolledAt: string;
  lastProgressAt: string | null;
  isArchived: boolean;
  droplet: {
    status?: string | null;
    isHidden?: boolean | null;
    lessonIds: number[];
  } | null;
  viewedLessonIds: number[];
  dueDate: string | null;
  reminder: ReminderState | null;
};

export type SkipReason =
  | "no_droplet"
  | "unpublished"
  | "hidden"
  | "archived"
  | "no_lessons"
  | "complete"
  | "muted"
  | "snoozed"
  | "stale"
  | "too_soon"
  | "enrolled_today"
  | "progress_today"
  | "gap"
  | "stopped";

export type Decision =
  | {
      eligible: true;
      snoozeEnded: boolean;
      dueInDays: number | null;
      lessonsLeft: number;
      fraction: number;
      idleDays: number;
      /** The count to store: effective count + 1, or as-is for an ended snooze */
      count: number;
    }
  | { eligible: false; reason: SkipReason };

/** Whole calendar days from one YYYY-MM-DD date to another */
export function daysBetween(fromDate: string, toDate: string): number {
  const ms = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((ms(toDate) - ms(fromDate)) / 86_400_000);
}

/** The learner's calendar date for an instant or a date string, null if invalid */
function dateOf(value: string | Date, timeZone: string): string | null {
  const dt =
    typeof value === "string"
      ? DateTime.fromISO(value, { zone: timeZone })
      : DateTime.fromJSDate(value, { zone: timeZone });
  return dt.isValid ? (dt.toISODate() as string) : null;
}

/** Idle, due and enrollment-age day counts; an invalid date counts as today or no due date. */
function dayCounts(
  input: {
    idleFrom: string | null;
    dueDate: string | null;
    enrolledAt: string | null;
  },
  now: Date,
  tz: string,
) {
  const today = localDate(now, tz);
  const since = (value: string | null) =>
    value === null ? null : daysBetween(dateOf(value, tz) ?? today, today);
  const dueOn = input.dueDate ? dateOf(input.dueDate, tz) : null;
  return {
    today,
    idleDays: since(input.idleFrom),
    dueInDays: dueOn ? daysBetween(today, dueOn) : null,
    enrollmentAgeDays: since(input.enrolledAt),
  };
}

/** The headline template state, shared by the raise and the feed read. */
export function templateState(
  input: {
    progress: { viewed: number; total: number } | null;
    started: boolean;
    idleFrom: string | null;
    dueDate: string | null;
    enrolledAt: string | null;
  },
  now: Date,
  timeZone?: string | null,
): ReminderTemplateState {
  const days = dayCounts(input, now, streakTimeZone(timeZone));
  return {
    progress: input.progress,
    started: input.started,
    idleDays: days.idleDays,
    dueInDays: days.dueInDays,
    enrollmentAgeDays: days.enrollmentAgeDays,
    today: days.today,
  };
}

/** The instant the learner's local day containing `now` began */
export function dayStartUtc(now: Date, timeZone?: string | null): Date {
  return DateTime.fromJSDate(now, { zone: streakTimeZone(timeZone) })
    .startOf("day")
    .toUTC()
    .toJSDate();
}

const progressedSince = (
  lastProgressAt: string | null,
  raisedAt: string | null,
) =>
  !!lastProgressAt &&
  !!raisedAt &&
  new Date(lastProgressAt).getTime() > new Date(raisedAt).getTime();

/** Reminders raised since the last progress: progress after the last raise resets it. */
export function effectiveCount(
  reminder: Pick<ReminderState, "count" | "lastRaisedAt"> | null,
  lastProgressAt: string | null,
): number {
  if (!reminder) return 0;
  if (progressedSince(lastProgressAt, reminder.lastRaisedAt)) return 0;
  return reminder.count ?? 0;
}

/** Whether a reminder was raised at or after the start of the learner's day. */
export function alreadyRaisedToday(
  reminders: { firstCreated?: string | Date | null }[],
  dayStart: Date,
): boolean {
  return reminders.some(
    (r) => !!r.firstCreated && new Date(r.firstCreated) >= dayStart,
  );
}

const isDueSoon = (dueInDays: number | null) =>
  dueInDays !== null &&
  dueInDays >= 0 &&
  dueInDays <= REMINDER_RULES.dueSoonDays;

/** Applies the rules to one enrollment; the first matching skip wins. */
export function evaluateCandidate(
  c: ReminderCandidate,
  now: Date,
  timeZone?: string | null,
): Decision {
  const tz = streakTimeZone(timeZone);
  const skip = (reason: SkipReason): Decision => ({ eligible: false, reason });
  const d = c.droplet;
  if (!d) return skip("no_droplet");
  if (d.status !== "published") return skip("unpublished");
  if (d.isHidden) return skip("hidden");
  if (c.isArchived) return skip("archived");
  if (d.lessonIds.length === 0) return skip("no_lessons");
  const viewed = new Set(c.viewedLessonIds);
  const viewedCount = d.lessonIds.filter((id) => viewed.has(id)).length;
  if (viewedCount === d.lessonIds.length) return skip("complete");

  const r = c.reminder;
  if (r?.muted) return skip("muted");
  const snoozedUntil = r?.snoozedUntil ? new Date(r.snoozedUntil) : null;
  if (snoozedUntil && snoozedUntil > now) return skip("snoozed");
  const snoozeEnded =
    !!snoozedUntil &&
    !progressedSince(c.lastProgressAt, r?.lastRaisedAt ?? null);

  const counts = dayCounts(
    {
      idleFrom: c.lastProgressAt ?? c.enrolledAt,
      dueDate: c.dueDate,
      enrolledAt: null,
    },
    now,
    tz,
  );
  const { today, dueInDays } = counts;
  const idleDays = counts.idleDays ?? 0;
  const dueSoon = isDueSoon(dueInDays);

  if (!dueSoon && idleDays > REMINDER_RULES.staleAfterDays) {
    return skip("stale");
  }
  if (!snoozeEnded) {
    if (dueSoon) {
      if (idleDays <= 0) {
        return skip(c.lastProgressAt ? "progress_today" : "enrolled_today");
      }
    } else if (idleDays < REMINDER_RULES.waitDays) {
      return skip("too_soon");
    }
    if (
      r?.lastRaisedAt &&
      daysBetween(dateOf(r.lastRaisedAt, tz) ?? today, today) <
        REMINDER_RULES.gapDays
    ) {
      return skip("gap");
    }
    if (
      effectiveCount(r, c.lastProgressAt) >= REMINDER_RULES.maxSinceProgress
    ) {
      return skip("stopped");
    }
  }

  const effective = effectiveCount(r, c.lastProgressAt);
  return {
    eligible: true,
    snoozeEnded,
    dueInDays,
    lessonsLeft: d.lessonIds.length - viewedCount,
    fraction: viewedCount / d.lessonIds.length,
    idleDays,
    count: snoozeEnded ? effective : effective + 1,
  };
}

/** Picks at most one candidate: snooze ended, due soon, nearest done, then id. */
export function pickReminder(
  cs: ReminderCandidate[],
  now: Date,
  timeZone?: string | null,
) {
  const tz = streakTimeZone(timeZone);
  const decisions = cs.map((candidate) => ({
    candidate,
    decision: evaluateCandidate(candidate, now, tz),
  }));
  const snoozedAt = (c: ReminderCandidate) =>
    new Date(c.reminder?.snoozedUntil ?? 0).getTime();

  const eligible = decisions.flatMap((x) =>
    x.decision.eligible ? [{ candidate: x.candidate, dec: x.decision }] : [],
  );
  eligible.sort((a, b) => {
    if (a.dec.snoozeEnded !== b.dec.snoozeEnded) {
      return a.dec.snoozeEnded ? -1 : 1;
    }
    if (a.dec.snoozeEnded) {
      const diff = snoozedAt(a.candidate) - snoozedAt(b.candidate);
      if (diff) return diff;
    }
    const aDue = isDueSoon(a.dec.dueInDays);
    const bDue = isDueSoon(b.dec.dueInDays);
    if (aDue !== bDue) return aDue ? -1 : 1;
    if (aDue) {
      const diff = (a.dec.dueInDays as number) - (b.dec.dueInDays as number);
      if (diff) return diff;
    }
    return (
      a.dec.lessonsLeft - b.dec.lessonsLeft ||
      b.dec.fraction - a.dec.fraction ||
      a.candidate.enrollmentId - b.candidate.enrollmentId
    );
  });

  const first = eligible[0];
  if (!first) return { pick: null, decisions };
  const { candidate, dec } = first;
  const total = candidate.droplet?.lessonIds.length ?? 0;
  const viewed = total - dec.lessonsLeft;
  const state = templateState(
    {
      progress: { viewed, total },
      started: viewed > 0,
      idleFrom: candidate.lastProgressAt ?? candidate.enrolledAt,
      dueDate: candidate.dueDate,
      enrolledAt: candidate.enrolledAt,
    },
    now,
    tz,
  );
  return { pick: { candidate, count: dec.count, state }, decisions };
}
