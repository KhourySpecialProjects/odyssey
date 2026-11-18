import { factories } from '@strapi/strapi';

const DOCUMENT_ID = /^[A-Za-z0-9]{1,32}$/;

export default factories.createCoreController('api::recommendation-dismissal.recommendation-dismissal', () => ({
  // The key needs plain documentId strings, not connect/set objects (ODY-954)
  async create(ctx) {
    const { user, droplet } = ctx.request.body?.data ?? {};
    if (![user, droplet].every((id) => typeof id === 'string' && DOCUMENT_ID.test(id))) {
      return ctx.badRequest('user and droplet must be documentIds');
    }
    return super.create(ctx);
  },
}));
