/**
 * announcement-read controller
 */

import { factories } from '@strapi/strapi';

const ANNOUNCEMENT_UID = 'api::announcement.announcement';
const READ_UID = 'api::announcement-read.announcement-read';

export default factories.createCoreController(READ_UID, () => ({
  // Also clears a readAt the backfill hasn't moved yet, so a later backfill can't
  // bring back a read mark the user just removed (ODY-786).
  async delete(ctx) {
    return strapi.db.transaction(async () => {
      const read = (await strapi.documents(READ_UID).findOne({
        documentId: ctx.params.id,
        populate: { announcement: { fields: ['id'] } },
      } as any)) as { announcement?: { id: number } | null } | null;
      const response = await super.delete(ctx);
      if (read?.announcement) {
        await strapi.db.query(ANNOUNCEMENT_UID).updateMany({
          where: { id: read.announcement.id, readAt: { $notNull: true } },
          data: { readAt: null },
        });
      }
      return response;
    });
  },
}));
