import "server-only";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { earliestDue, reminderHeadline } from "@/lib/reminder-progress";
import {
  alreadyRaisedToday,
  dayStartUtc,
  pickReminder,
  type ReminderCandidate,
} from "@/lib/reminder-rules";
import { readJsonOrNull } from "@/lib/strapi-response";
import { streakTimeZone } from "@/lib/streaks";
import type { StreakLearner } from "@/lib/streak-days";
import { fetchAPI, STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";

// ODY-931: loads a learner's data, applies the rules and asks Strapi to raise
// at most one reminder. Not a "use server" file: callers pass the session's learner.

// Learners past 250 enrollments are checked on the first 250 only (accepted)
const PAGE_SIZE = 250;

type ReminderRow = {
  id: number;
  firstCreated?: string | null;
  reminderCount?: number | null;
  reminderSnoozedUntil?: string | null;
  reminderMuted?: boolean | null;
  droplet?: { id: number } | null;
};

type EnrollmentRow = {
  id: number;
  createdAt: string;
  lastProgressDate?: string | null;
  isArchived?: boolean | null;
  viewedLessons?: { id: number }[];
  droplet?: {
    id: number;
    name: string;
    status?: string | null;
    isHidden?: boolean | null;
    lessons?: { id: number }[];
  } | null;
};

type DueRow = {
  dueDate: string | null;
  droplet?: { id: number } | null;
  group?: { groupName?: string } | null;
};

export type ReminderCheck = {
  raised: boolean;
  reason?: string;
  pick?: ReturnType<typeof pickReminder>["pick"];
  decisions?: ReturnType<typeof pickReminder>["decisions"];
};

/** Raises at most one reminder for the learner. `dryRun` decides without writing. Never throws. */
export async function runReminderCheck(
  learner: StreakLearner,
  { now = new Date(), dryRun = false } = {},
): Promise<ReminderCheck> {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/announcements/raise-reminder`;
  try {
    const tz = streakTimeZone(learner.timeZone);
    const dayStart = dayStartUtc(now, tz);

    const rows = await fetchAPI<ReminderRow[]>("/announcements", {
      urlParams: {
        filters: {
          type: { $eq: "reminder" },
          authorized_user: { id: { $eq: learner.id } },
        },
        fields: [
          "firstCreated",
          "reminderCount",
          "reminderSnoozedUntil",
          "reminderMuted",
        ],
        populate: { droplet: { fields: ["id"] } },
        sort: ["id:asc"],
        pagination: { pageSize: PAGE_SIZE, page: 1 },
      },
      cache: "no-store",
    });
    if (!dryRun && alreadyRaisedToday(rows, dayStart)) {
      return { raised: false, reason: "today" };
    }

    const [enrollments, dueRows] = await Promise.all([
      fetchAPI<EnrollmentRow[]>("/enrollments", {
        urlParams: {
          filters: { authorizedUser: { id: { $eq: learner.id } } },
          fields: ["id", "createdAt", "lastProgressDate", "isArchived"],
          populate: {
            viewedLessons: { fields: ["id"] },
            droplet: {
              fields: ["id", "name", "status", "isHidden"],
              populate: { lessons: { fields: ["id"] } },
            },
          },
          pagination: { pageSize: PAGE_SIZE, page: 1 },
        },
        cache: "no-store",
      }),
      // Only rows with a droplet; playlist due dates are ignored, as on the card
      fetchAPI<DueRow[]>("/due-dates", {
        urlParams: {
          filters: {
            authorized_user: { id: { $eq: learner.id } },
            droplet: { id: { $notNull: true } },
            dueDate: { $notNull: true },
          },
          fields: ["dueDate"],
          populate: {
            droplet: { fields: ["id"] },
            group: { fields: ["groupName"] },
          },
          pagination: { pageSize: PAGE_SIZE, page: 1 },
        },
        cache: "no-store",
      }),
    ]);

    const candidates: ReminderCandidate[] = enrollments.map((e) => {
      const row = rows.find((r) => r.droplet?.id === e.droplet?.id);
      return {
        enrollmentId: e.id,
        dropletId: e.droplet?.id ?? 0,
        dropletName: e.droplet?.name ?? "this droplet",
        enrolledAt: e.createdAt,
        lastProgressAt: e.lastProgressDate ?? null,
        isArchived: !!e.isArchived,
        droplet: e.droplet
          ? {
              status: e.droplet.status,
              isHidden: e.droplet.isHidden,
              lessonIds: (e.droplet.lessons ?? []).map((l) => l.id),
            }
          : null,
        viewedLessonIds: (e.viewedLessons ?? []).map((l) => l.id),
        dueDate:
          earliestDue(dueRows.filter((d) => d.droplet?.id === e.droplet?.id))
            ?.dueDate ?? null,
        reminder: row
          ? {
              lastRaisedAt: row.firstCreated ?? null,
              count: row.reminderCount ?? null,
              snoozedUntil: row.reminderSnoozedUntil ?? null,
              muted: !!row.reminderMuted,
            }
          : null,
      };
    });

    const { pick, decisions } = pickReminder(candidates, now, tz);
    if (!pick) return { raised: false, reason: "none", pick, decisions };
    if (dryRun) return { raised: false, reason: "dry_run", pick, decisions };

    // The raise route 400s on untrimmed content or more than 500 chars
    const content = reminderHeadline(pick.candidate.dropletName, pick.state)
      .trim()
      .slice(0, 500);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({
        data: {
          userId: learner.id,
          dropletId: pick.candidate.dropletId,
          now: now.toISOString(),
          dayStart: dayStart.toISOString(),
          lastRaisedAt: pick.candidate.reminder?.lastRaisedAt ?? null,
          count: pick.count,
          content,
        },
      }),
      cache: "no-store",
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      console.error(
        `POST ${url} failed:`,
        response.status,
        json?.error?.message ?? null,
      );
      return { raised: false, reason: "error", pick, decisions };
    }
    if (json.data.raised !== true) {
      return { raised: false, reason: json.data.reason, pick, decisions };
    }
    revalidateTag(CACHE_TAGS.userFeed(learner.id));
    return { raised: true, pick, decisions };
  } catch (error) {
    console.error("Error checking reminders:", error);
    return { raised: false, reason: "error" };
  }
}
