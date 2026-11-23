/**
 * announcement controller
 */

import { factories } from '@strapi/strapi'

const ANNOUNCEMENT_UID = 'api::announcement.announcement';
const READ_UID = 'api::announcement-read.announcement-read';

export default factories.createCoreController(ANNOUNCEMENT_UID, () => ({
  // ?unreadBy=<userId> leaves out what that user marked read (ODY-786). Done here,
  // so the request URL never grows with their read history.
  async find(ctx) {
    if (ctx.query.unreadBy === undefined) return super.find(ctx);
    const unreadBy = Number(ctx.query.unreadBy);
    if (!Number.isInteger(unreadBy) || unreadBy <= 0) {
      return ctx.badRequest('unreadBy must be a user id');
    }

    await this.validateQuery(ctx);
    const { unreadBy: _unreadBy, ...query } = (await this.sanitizeQuery(ctx)) as Record<string, any>;
    const reads = await strapi.documents(READ_UID).findMany({
      filters: { authorized_user: { id: unreadBy } },
      fields: ['id'],
      populate: { announcement: { fields: ['id'] } },
    } as any);
    const readIds = reads.map((r: any) => r.announcement?.id).filter((id) => id != null);
    const notRead = { id: { $notIn: readIds } };
    const filters = !readIds.length ? query.filters : query.filters ? { $and: [query.filters, notRead] } : notRead;

    const { results, pagination } = await strapi.service(ANNOUNCEMENT_UID).find({ ...query, filters });
    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedResults, { pagination });
  },
}));
