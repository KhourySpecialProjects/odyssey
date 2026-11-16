"use server";

import { withAuth } from "@/lib/auth/guards";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { runReminderCheck } from "@/lib/reminders";
import type { AuthorizedUser } from "@/types";

/**
 * Raises the caller's one reminder for today if the rules allow it (ODY-931).
 * Takes no arguments: the learner always comes from the session.
 */
export async function checkMyReminder() {
  return withAuth([], async (user) => {
    try {
      const record = await getAuthorizedUserByEmail<
        Pick<AuthorizedUser, "id" | "timeZone">
      >(user.email, { fields: ["id", "timeZone"] });
      const { raised } = await runReminderCheck({
        id: user.id,
        timeZone: record?.timeZone,
      });
      return { ok: true as const, error: null, data: { raised } };
    } catch (error) {
      console.error("Error checking reminders:", error);
      return {
        ok: false as const,
        error: "Couldn't check your reminders.",
        data: null,
      };
    }
  });
}
