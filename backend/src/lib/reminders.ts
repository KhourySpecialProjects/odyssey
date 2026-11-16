// Reminder raise (ODY-931): Next.js decides which droplet to remind a learner
// about; this records it once, under a lock on the learner's row.

const ANNOUNCEMENT_UID = 'api::announcement.announcement';
const USER_UID = 'api::authorized-user.authorized-user';
const ENROLLMENT_UID = 'api::enrollment.enrollment';
const DROPLET_UID = 'api::droplet.droplet';

/** Thrown with the HTTP status the controller should answer with. */
export class ReminderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Row = Record<string, any>;

export type RaiseReminderInput = {
  userId: number;
  dropletId: number;
  /** ISO instant of the raise; becomes the row's firstCreated */
  now: string;
  /** ISO instant of the learner's local midnight today */
  dayStart: string;
  /** firstCreated the caller saw on the row, or null when it saw none */
  lastRaisedAt: string | null;
  /** Reminders since the last progress, this one included */
  count: number;
  content: string;
};

export type RaiseReminderResult =
  | { raised: true; id: number }
  | { raised: false; reason: 'today' | 'changed' | 'declined' };

const time = (value: unknown) =>
  value == null ? null : new Date(value as string).getTime();

/**
 * Creates or re-raises the learner's reminder row, locking the user and the
 * row so a concurrent ODY-932 write lands first or waits.
 */
export async function raiseReminder(
  input: RaiseReminderInput
): Promise<RaiseReminderResult> {
  return strapi.db.transaction(async () => {
    await strapi.db
      .queryBuilder(USER_UID)
      .select(['id'])
      .where({ id: input.userId })
      .forUpdate()
      .first()
      .execute();
    const user = (await strapi.documents(USER_UID).findFirst({
      filters: { id: input.userId },
      fields: ['id'],
    } as any)) as Row | null;
    if (!user) throw new ReminderError(404, 'User not found');

    const mine = {
      type: 'reminder',
      authorized_user: { id: input.userId },
    };
    const raisedToday = await strapi.documents(ANNOUNCEMENT_UID).findFirst({
      filters: { ...mine, firstCreated: { $gte: input.dayStart } },
      fields: ['id'],
    } as any);
    if (raisedToday) return { raised: false, reason: 'today' } as const;

    const rowQuery = {
      filters: { ...mine, droplet: { id: input.dropletId } },
      fields: ['firstCreated', 'reminderSnoozedUntil', 'reminderMuted'],
      sort: { id: 'asc' },
    } as any;
    let row = (await strapi
      .documents(ANNOUNCEMENT_UID)
      .findFirst(rowQuery)) as Row | null;
    if (row) {
      // Lock by id only: FOR UPDATE can't apply to an outer join's nullable side.
      await strapi.db
        .queryBuilder(ANNOUNCEMENT_UID)
        .select(['id'])
        .where({ id: row.id })
        .forUpdate()
        .first()
        .execute();
      // Re-read under the lock to see a just-committed snooze or mute.
      row = (await strapi
        .documents(ANNOUNCEMENT_UID)
        .findFirst(rowQuery)) as Row | null;
    }
    if (time(row?.firstCreated) !== time(input.lastRaisedAt)) {
      return { raised: false, reason: 'changed' } as const;
    }
    const snoozedUntil = time(row?.reminderSnoozedUntil);
    if (
      row &&
      (row.reminderMuted ||
        (snoozedUntil !== null && snoozedUntil > time(input.now)!))
    ) {
      return { raised: false, reason: 'declined' } as const;
    }

    const enrollment = await strapi.documents(ENROLLMENT_UID).findFirst({
      filters: {
        authorizedUser: { id: input.userId },
        droplet: { id: input.dropletId },
      },
      fields: ['id'],
    } as any);
    const droplet = (await strapi.documents(DROPLET_UID).findFirst({
      filters: { id: input.dropletId },
      fields: ['id'],
    } as any)) as Row | null;
    if (!enrollment || !droplet) {
      throw new ReminderError(409, 'Not enrolled in this droplet');
    }

    // A raise clears the snooze: it is null or already over by now.
    const data = {
      firstCreated: input.now,
      readAt: null,
      reminderCount: input.count,
      reminderSnoozedUntil: null,
      content: input.content,
    };
    if (row) {
      await strapi.documents(ANNOUNCEMENT_UID).update({
        documentId: row.documentId,
        data,
      } as any);
      return { raised: true, id: row.id } as const;
    }
    const created = (await strapi.documents(ANNOUNCEMENT_UID).create({
      data: {
        ...data,
        type: 'reminder',
        reminderMuted: false,
        authorized_user: user.documentId,
        droplet: droplet.documentId,
      },
    } as any)) as Row;
    return { raised: true, id: created.id } as const;
  });
}
