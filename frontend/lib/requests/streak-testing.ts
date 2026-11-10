"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { AuthUser } from "@/lib/auth/guards";
import { withAuth } from "@/lib/auth/guards";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import {
  getStreakFor,
  recordStreakDay,
  type StreakLearner,
} from "@/lib/streak-days";
import { TEST_STREAK_MAX, testStreakDays } from "@/lib/streak-test-days";
import {
  clearTestStreakDays,
  REAL_STREAK,
  setStreakTestMode,
  setTestStreakDays,
  streakTestingEnabled,
  streakTestMode,
  type StreakTestMode,
} from "@/lib/streak-testing";
import { localDate, streakTimeZone, addDays } from "@/lib/streaks";
import type { AuthorizedUser } from "@/types";

// The streak testing panel's actions (ODY-921, TEMPORARY: remove before
// streaks launch). System Admins only, and only where testing is enabled.
// Each changes only the caller's own test rows and test mode.

const settingsSchema = z.object({
  current: z.number().int().min(0).max(TEST_STREAK_MAX),
  litToday: z.boolean(),
  missedYesterday: z.boolean(),
  revivesUsed: z.number().int().min(0).max(2),
  history: z.boolean(),
});

/** A lesson id for days moved on with a lesson: only the count shows */
const TEST_LESSON_ID = 1;

async function learnerOf(user: AuthUser): Promise<StreakLearner> {
  const record = await getAuthorizedUserByEmail<
    Pick<AuthorizedUser, "id" | "timeZone">
  >(user.email, { fields: ["id", "timeZone"] });
  return { id: user.id, timeZone: record?.timeZone };
}

const SYS_ADMIN = [AuthorizedUserRoleTitle.SysAdmin];

/** A refusal the panel shows as it is */
class PanelError extends Error {}

/**
 * Runs one panel change for the caller (already through the gate) where
 * testing is enabled, then returns their streak in the mode it leaves.
 */
async function runPanel(
  user: AuthUser,
  run: (learner: StreakLearner) => Promise<StreakTestMode>,
) {
  if (!streakTestingEnabled()) {
    return { ok: false as const, error: "Not available here", data: null };
  }
  try {
    const learner = await learnerOf(user);
    const mode = await run(learner);
    revalidateTag(CACHE_TAGS.streak(user.id));
    const streak = await getStreakFor(learner, { fresh: true, mode });
    return { ok: true as const, error: null, data: { streak, mode } };
  } catch (error) {
    if (error instanceof PanelError) {
      return { ok: false as const, error: error.message, data: null };
    }
    console.error("Streak testing panel:", error);
    return {
      ok: false as const,
      error: "That didn't work. Is Strapi running with testing on?",
      data: null,
    };
  }
}

/** Replaces the caller's test streak with `settings` and turns test mode on, keeping the moved "today" */
export async function setTestStreak(settings: z.infer<typeof settingsSchema>) {
  const parsed = settingsSchema.safeParse(settings);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid settings", data: null };
  }
  return withAuth(SYS_ADMIN, (user) =>
    runPanel(user, async (learner) => {
      const current = await streakTestMode();
      const mode = { test: true, offsetDays: current.offsetDays };
      const today = addDays(
        localDate(new Date(), streakTimeZone(learner.timeZone)),
        mode.offsetDays,
      );
      await setTestStreakDays(user.id, testStreakDays(parsed.data, today));
      await setStreakTestMode(mode);
      return mode;
    }),
  );
}

/** Moves the test "today" on a day, with or without a lesson on the new day */
export async function moveTestDay(withLesson: boolean) {
  return withAuth(SYS_ADMIN, (user) =>
    runPanel(user, async (learner) => {
      const current = await streakTestMode();
      if (!current.test) throw new PanelError("Set a test streak first");
      const mode = { test: true, offsetDays: current.offsetDays + 1 };
      await setStreakTestMode(mode);
      if (withLesson) {
        await recordStreakDay(learner, TEST_LESSON_ID, new Date(), mode);
      }
      return mode;
    }),
  );
}

/** Deletes the caller's test rows and turns test mode off: the real streak and date are back */
export async function resetTestStreak() {
  return withAuth(SYS_ADMIN, (user) =>
    runPanel(user, async () => {
      await clearTestStreakDays(user.id);
      await setStreakTestMode(null);
      return REAL_STREAK;
    }),
  );
}
