import "server-only";
import { cookies } from "next/headers";
import { readJsonOrNull } from "@/lib/strapi-response";
import type { StreakDay } from "@/lib/streaks";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";

// The streak testing panel (ODY-921, TEMPORARY: remove before streaks
// launch). While its cookie is set, every streak read and write for that
// browser uses the learner's test rows (`test: true` in Strapi) and a
// "today" moved by `offsetDays`, so the real streak is never touched. Only
// the panel's System Admin actions set the cookie, and it's ignored on
// production. Someone who forges it only reaches their own test rows.

const COOKIE = "streak-testing";

/** On wherever NEXT_PUBLIC_APP_ENV is set and isn't production: local, dev, demo */
export function streakTestingEnabled(): boolean {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  return !!env && env !== "production";
}

export type StreakTestMode = { test: boolean; offsetDays: number };

export const REAL_STREAK: StreakTestMode = { test: false, offsetDays: 0 };

/** How far the panel's "today" can move from the real one, either way */
export const MAX_TEST_OFFSET = 400;

/** The panel's mode for this request; the real streak outside one, or off */
export async function streakTestMode(): Promise<StreakTestMode> {
  if (!streakTestingEnabled()) return REAL_STREAK;
  try {
    const raw = (await cookies()).get(COOKIE)?.value;
    if (!raw) return REAL_STREAK;
    const offsetDays = Number(JSON.parse(raw)?.offsetDays ?? 0);
    return {
      test: true,
      offsetDays:
        Number.isInteger(offsetDays) && Math.abs(offsetDays) <= MAX_TEST_OFFSET
          ? offsetDays
          : 0,
    };
  } catch {
    // No request (scripts, tests) or a garbled cookie
    return REAL_STREAK;
  }
}

/** Turns test mode on with `mode`, or off with null. Server Actions only. */
export async function setStreakTestMode(mode: StreakTestMode | null) {
  const jar = await cookies();
  if (!mode?.test) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, JSON.stringify({ offsetDays: mode.offsetDays }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

async function postTestRoute(path: "set" | "clear", data: object) {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/streak-days/test/${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
      ...STRAPI_RESPONSE_FORMAT_HEADER,
    },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });
  if (!response.ok) {
    const json = await readJsonOrNull(response).catch(() => null);
    throw new Error(
      `POST ${url} failed: ${response.status} ${json?.error?.message ?? ""}`,
    );
  }
}

/** Replaces the learner's test rows with `days` */
export const setTestStreakDays = (userId: number, days: StreakDay[]) =>
  postTestRoute("set", {
    userId,
    days: days.map(({ date, lessons, revived }) => ({
      date,
      lessons,
      ...(revived && { revived: true }),
    })),
  });

/** Deletes the learner's test rows; their real ones stay */
export const clearTestStreakDays = (userId: number) =>
  postTestRoute("clear", { userId });
