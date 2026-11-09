// Carries readAt on targeted rows over to per-user read rows (ODY-786), then clears
// it so the copy runs once and a later "mark unread" is never undone on restart.
const ANNOUNCEMENT_UID = 'api::announcement.announcement';
const READ_UID = 'api::announcement-read.announcement-read';
// Rows whose authorized_user is the recipient; friend/kudos rows belong to the actor.
const TARGETED_TYPES = ['system', 'review_feedback', 'review_published'];

export async function backfillAnnouncementReads(): Promise<number> {
  const rows = await strapi.db.query(ANNOUNCEMENT_UID).findMany({
    where: {
      readAt: { $notNull: true },
      type: { $in: TARGETED_TYPES },
      authorized_user: { id: { $notNull: true } },
    },
    populate: { authorized_user: { select: ['id'] } },
  });

  let copied = 0;
  for (const row of rows) {
    await strapi.db.transaction(async () => {
      const exists = await strapi.db.query(READ_UID).findOne({
        where: { announcement: row.id, authorized_user: row.authorized_user.id },
      });
      if (!exists) {
        await strapi.db.query(READ_UID).create({
          data: { announcement: row.id, authorized_user: row.authorized_user.id },
        });
        copied += 1;
      }
      await strapi.db.query(ANNOUNCEMENT_UID).update({
        where: { id: row.id },
        data: { readAt: null },
      });
    });
  }
  return copied;
}
