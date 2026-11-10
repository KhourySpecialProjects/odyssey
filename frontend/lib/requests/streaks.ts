"use server";

import { withAuth } from "@/lib/auth/guards";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getStreakFor } from "@/lib/streak-days";
import type { Streak } from "@/lib/streaks";
import type { AuthorizedUser } from "@/types";

/**
 * The signed-in learner's streak (ODY-918): the current and longest streak,
 * whether today is lit, and every day behind it, for the streak UI (ODY-919).
 * Only ever the caller's own.
 */
export async function getMyStreak() {
  return withAuth([], async (user) => {
    try {
      const record = await getAuthorizedUserByEmail<
        Pick<AuthorizedUser, "id" | "timeZone">
      >(user.email, { fields: ["id", "timeZone"] });
      const data: Streak = await getStreakFor({
        id: user.id,
        timeZone: record?.timeZone,
      });
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
