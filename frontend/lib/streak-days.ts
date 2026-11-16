import "server-only";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { readJsonOrNull } from "@/lib/strapi-response";
import {
  addDays,
  localDate,
  reviveOffer,
  STREAK_REVIVES,
  streakTimeZone,
  summarizeStreak,
  type Streak,
  type StreakDay,
} from "@/lib/streaks";
import {
  fetchAPI,
  flattenAttributes,
  STRAPI_RESPONSE_FORMAT_HEADER,
} from "@/lib/utils";
import type { StreakDayEntry } from "@/types";

// A learner's streak days in Strapi (ODY-918): one row per local date they
// finished a new lesson (backend/src/lib/streak-days.ts). Deliberately not a
// "use server" file: every export of one is a public endpoint, and these
// trust the learner they're given. Callers take it from the session.

/** Whose streak: the learner's numeric id and their time zone from Settings */
export type StreakLearner = { id: number; timeZone?: string | null };

/** Strapi's REST maxLimit, so most learners' days come back in one page */
const PAGE_SIZE = 1000;

/**
 * Records that the learner finished `lessonId` for the first time, on
 * today's date in their time zone. Repeating it is harmless. Never throws:
 * a streak that fails to save mustn't fail the lesson. Returns whether the
 * day saved.
 */
export async function recordStreakDay(
  learner: StreakLearner,
  lessonId: number,
  now = new Date(),
): Promise<boolean> {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/streak-days/record`;
  try {
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
          date: localDate(now, streakTimeZone(learner.timeZone)),
          lessonId,
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
      return false;
    }
    // A lesson already on the day changed nothing
    if (json.data.added !== false) {
      revalidateTag(CACHE_TAGS.streak(learner.id));
    }
    return true;
  } catch (error) {
    console.error(`POST ${url} failed:`, error);
    return false;
  }
}

type DaysPage = {
  data: unknown;
  meta?: { pagination?: { pageCount?: number } };
};

/** Every day that counts toward the learner's streak, oldest first. `fresh` skips the cache, for a read right after a write. */
async function getStreakDays(
  userId: number,
  { fresh = false } = {},
): Promise<StreakDay[]> {
  const days: StreakDay[] = [];
  for (let page = 1; ; page++) {
    const response = await fetchAPI<DaysPage>("/streak-days", {
      urlParams: {
        filters: { user: { id: { $eq: userId } } },
        fields: ["date", "lessonIds", "revived"],
        sort: ["date:asc"],
        pagination: { page, pageSize: PAGE_SIZE },
      },
      ...(fresh
        ? { cache: "no-store" as const }
        : { next: { tags: [CACHE_TAGS.streak(userId)], revalidate: 900 } }),
      flattenResponse: false,
    });
    const rows: StreakDayEntry[] = flattenAttributes(response.data) ?? [];
    for (const row of rows) {
      const lessons = Array.isArray(row.lessonIds) ? row.lessonIds.length : 0;
      days.push({
        date: row.date,
        lessons,
        ...(row.revived && { revived: true }),
      });
    }
    if (page >= (response.meta?.pagination?.pageCount ?? 1)) return days;
  }
}

/**
 * The learner's streak on `now`. Only the rows are cached: the streak is
 * worked out on every call, so it moves on at the learner's midnight.
 */
export async function getStreakFor(
  learner: StreakLearner,
  { now = new Date(), fresh = false } = {},
): Promise<Streak> {
  const today = localDate(now, streakTimeZone(learner.timeZone));
  const days = await getStreakDays(learner.id, { fresh });
  const dates = days.map((day) => day.date);
  const revived = days.filter((day) => day.revived).length;
  const revivesLeft = Math.max(0, STREAK_REVIVES - revived);
  return {
    ...summarizeStreak(dates, today),
    today,
    days,
    revivesLeft,
    revive: reviveOffer(dates, today, revivesLeft),
  };
}

export type ReviveResult = { ok: true } | { ok: false; message: string };

/**
 * Spends one of the learner's revives on their yesterday (ODY-920). Strapi
 * checks it can be revived and that one is left; a repeat spends nothing.
 * Never throws.
 */
export async function reviveStreakDay(
  learner: StreakLearner,
  now = new Date(),
): Promise<ReviveResult> {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/streak-days/revive`;
  const today = localDate(now, streakTimeZone(learner.timeZone));
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify({
        data: { userId: learner.id, date: addDays(today, -1) },
      }),
      cache: "no-store",
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      const message: string | undefined = json?.error?.message;
      console.error(`POST ${url} failed:`, response.status, message ?? null);
      // A 409's message says why ("No revives left"); anything else is ours
      return {
        ok: false,
        message:
          response.status === 409 && message
            ? message
            : "Couldn't revive your streak. Try again.",
      };
    }
    revalidateTag(CACHE_TAGS.streak(learner.id));
    return { ok: true };
  } catch (error) {
    console.error(`POST ${url} failed:`, error);
    return { ok: false, message: "Couldn't revive your streak. Try again." };
  }
}
