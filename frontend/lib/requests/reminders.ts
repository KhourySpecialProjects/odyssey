"use server";

import { withAuth, type AuthUser } from "@/lib/auth/guards";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import {
  dayStartUtc,
  isSnoozeChoice,
  REMINDER_RULES,
  snoozeDateLabel,
  type SnoozeChoice,
} from "@/lib/reminder-rules";
import {
  isReminderId,
  loadOwnReminder,
  runReminderCheck,
  writeReminderState,
} from "@/lib/reminders";
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

const UPDATE_ERROR = "Couldn't update this reminder.";

/** Loads the caller's reminder (and their zone if needed), then writes the fields `build` returns. */
async function updateOwnReminder<T>(
  user: AuthUser,
  id: unknown,
  needsZone: boolean,
  build: (
    now: Date,
    tz: string | null | undefined,
  ) => { data: Parameters<typeof writeReminderState>[1]; result: T },
) {
  try {
    if (!isReminderId(id)) {
      return { ok: false as const, error: "invalid" as const, data: null };
    }
    const [own, record] = await Promise.all([
      loadOwnReminder(id, user),
      needsZone
        ? getAuthorizedUserByEmail<Pick<AuthorizedUser, "id" | "timeZone">>(
            user.email,
            { fields: ["id", "timeZone"] },
          )
        : null,
    ]);
    if (!own.ok) return { ok: false as const, error: own.error, data: null };
    const { data, result } = build(new Date(), record?.timeZone);
    await writeReminderState(own.row, data, user.id);
    return { ok: true as const, error: null, data: result };
  } catch (error) {
    console.error("Error updating reminder:", error);
    return { ok: false as const, error: UPDATE_ERROR, data: null };
  }
}

/** Snoozes the caller's reminder to local midnight 1, 3 or 7 days ahead. */
export async function snoozeReminder(id: number, choice: SnoozeChoice) {
  return withAuth([], async (user) => {
    if (!isSnoozeChoice(choice)) {
      return { ok: false as const, error: "invalid", data: null };
    }
    return updateOwnReminder(user, id, true, (now, tz) => {
      const until = dayStartUtc(now, tz, REMINDER_RULES.snoozeDays[choice]);
      return {
        data: {
          readAt: now.toISOString(),
          reminderSnoozedUntil: until.toISOString(),
          reminderMutedUntil: null,
        },
        result: {
          until: until.toISOString(),
          dateLabel: snoozeDateLabel(until, tz),
        },
      };
    });
  });
}

/** Mutes the caller's reminder until local midnight 30 days ahead. */
export async function muteReminder(id: number) {
  return withAuth([], async (user) =>
    updateOwnReminder(user, id, true, (now, tz) => ({
      data: {
        readAt: now.toISOString(),
        reminderSnoozedUntil: null,
        reminderMutedUntil: dayStartUtc(
          now,
          tz,
          REMINDER_RULES.muteDays,
        ).toISOString(),
      },
      result: null,
    })),
  );
}

/** Puts the caller's reminder back in Unread and clears any snooze or mute. */
export async function undoReminder(id: number) {
  return withAuth([], async (user) =>
    updateOwnReminder(user, id, false, () => ({
      data: {
        readAt: null,
        reminderSnoozedUntil: null,
        reminderMutedUntil: null,
      },
      result: null,
    })),
  );
}
