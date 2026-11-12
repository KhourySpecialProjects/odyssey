import "server-only";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { readJsonOrNull } from "@/lib/strapi-response";
import {
  localDate,
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

/** Every day the learner finished a new lesson, oldest first */
async function getStreakDays(userId: number): Promise<StreakDay[]> {
  const days: StreakDay[] = [];
  for (let page = 1; ; page++) {
    const response = await fetchAPI<DaysPage>("/streak-days", {
      urlParams: {
        filters: { user: { id: { $eq: userId } } },
        fields: ["date", "lessonIds"],
        sort: ["date:asc"],
        pagination: { page, pageSize: PAGE_SIZE },
      },
      next: { tags: [CACHE_TAGS.streak(userId)], revalidate: 900 },
      flattenResponse: false,
    });
    const rows: StreakDayEntry[] = flattenAttributes(response.data) ?? [];
    for (const row of rows) {
      const lessons = Array.isArray(row.lessonIds) ? row.lessonIds.length : 0;
      days.push({ date: row.date, lessons });
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
  now = new Date(),
): Promise<Streak> {
  const today = localDate(now, streakTimeZone(learner.timeZone));
  const days = await getStreakDays(learner.id);
  return {
    ...summarizeStreak(
      days.map((day) => day.date),
      today,
    ),
    today,
    days,
  };
}
