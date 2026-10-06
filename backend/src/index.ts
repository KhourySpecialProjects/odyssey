import { markClaimedVoyageNodesAuthored } from './lib/lifecycle-utils';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // Finish voyage claims whose droplet was published before publishing marked
    // them "authored". A no-op once caught up; never blocks startup.
    try {
      const count = await markClaimedVoyageNodesAuthored({ status: 'published' });
      if (count > 0) strapi.log.info(`Marked ${count} claimed voyage node(s) as authored`);
    } catch (error) {
      strapi.log.error('Could not mark published voyage claims as authored', error);
    }
  },
};
