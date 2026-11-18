import { factories } from '@strapi/strapi';

const UID = 'api::recommendation-dismissal.recommendation-dismissal';

export default factories.createCoreService(UID, ({ strapi }) => ({
  // One row per student and droplet: a repeat returns the existing row (ODY-954)
  async create(params: {
    data: { user: string; droplet: string; [k: string]: unknown };
  }) {
    const key = `${params.data.user}:${params.data.droplet}`;
    const find = () => strapi.documents(UID).findFirst({ filters: { key } });
    const existing = await find();
    if (existing) return existing;
    try {
      return await super.create({ ...params, data: { ...params.data, key } });
    } catch (err) {
      const raced = await find();
      if (raced) return raced;
      throw err;
    }
  },
}));
