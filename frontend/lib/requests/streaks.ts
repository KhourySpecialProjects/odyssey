"use server";

import { withAuth } from "@/lib/auth/guards";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import {
  getStreakFor,
  reviveStreakDay,
  type StreakLearner,
} from "@/lib/streak-days";
import type { Streak } from "@/lib/streaks";
import type { AuthorizedUser } from "@/types";

/** The caller's numeric id from the gate, and their time zone from their record */
async function learnerOf(user: {
  id: number;
  email: string;
}): Promise<StreakLearner> {
  const record = await getAuthorizedUserByEmail<
    Pick<AuthorizedUser, "id" | "timeZone">
  >(user.email, { fields: ["id", "timeZone"] });
  return { id: user.id, timeZone: record?.timeZone };
}

/**
 * The signed-in learner's streak (ODY-918): the current and longest streak,
 * whether today is lit, the revive on offer, and every day behind it, for
 * the streak UI (ODY-919). Only ever the caller's own.
 */
export async function getMyStreak() {
  return withAuth([], async (user) => {
    try {
      const data: Streak = await getStreakFor(await learnerOf(user));
      return { ok: true as const, error: null, data };
    } catch (error) {
      console.error("Error getting the streak:", error);
      return {
        ok: false as const,
        error: "Couldn't load your streak.",
        data: null,
      };
    }
  });
}

/**
 * Spends one of the caller's revives on their yesterday (ODY-920) and
 * returns the streak after it. Takes no arguments: the day is worked out
 * from the caller's time zone, and Strapi checks it can be revived.
 */
export async function reviveStreak() {
  return withAuth([], async (user) => {
    try {
      const learner = await learnerOf(user);
      const revived = await reviveStreakDay(learner);
      if (!revived.ok) {
        return { ok: false as const, error: revived.message, data: null };
      }
      // Fresh: the cached days are a write behind
      const data: Streak = await getStreakFor(learner, { fresh: true });
      return { ok: true as const, error: null, data };
    } catch (error) {
      console.error("Error reviving the streak:", error);
      return {
        ok: false as const,
        error: "Couldn't revive your streak. Try again.",
        data: null,
      };
    }
  });
}
