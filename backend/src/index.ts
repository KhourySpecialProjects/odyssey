import type { Core } from "@strapi/strapi";
import { markClaimedVoyageNodesAuthored } from './lib/lifecycle-utils';
import { seedReviewCriteria, upgradeReviewCriteria } from './lib/review-criteria-seed';
import { seedAiScoringSettings } from './lib/ai-scoring-settings';
import { seedMentorSettings } from './lib/mentor-settings';
import { backfillReviewRounds } from './lib/review-round-backfill';
import { backfillTimeZones } from './lib/time-zone-backfill';
import { backfillLastProgress } from './lib/enrollment-progress-backfill';

const SLUG_UPDATE_HANDLERS = [
  "api::droplet.droplet.update",
  "api::lesson.lesson.update",
  "api::playlist.playlist.update",
];

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // v5-only: core update rejects unknown body.data keys; the slug lifecycles read and delete this one (ODY-700).
    strapi.contentAPI.addInputParams({
      regenerateSlug: {
        schema: (z) => z.boolean().optional(),
        matchRoute: (route) =>
          route.method === "PUT" &&
          typeof route.handler === "string" &&
          SLUG_UPDATE_HANDLERS.includes(route.handler),
      },
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Finish voyage claims whose droplet was published before publishing marked
    // them "authored". A no-op once caught up; never blocks startup.
    try {
      const count = await markClaimedVoyageNodesAuthored({ status: 'published' });
      if (count > 0) strapi.log.info(`Marked ${count} claimed voyage node(s) as authored`);
    } catch (error) {
      strapi.log.error('Could not mark published voyage claims as authored', error);
    }

    // Seeds the starter rubric only into an empty table; never blocks startup.
    try {
      const seeded = await seedReviewCriteria();
      if (seeded > 0) strapi.log.info(`Seeded ${seeded} review criteria`);
    } catch (error) {
      strapi.log.error('Could not seed review criteria', error);
    }

    // Criteria still on the starter wording get the ODY-862 wording; never blocks startup.
    try {
      const reworded = await upgradeReviewCriteria();
      if (reworded > 0) strapi.log.info(`Reworded ${reworded} review criteria`);
    } catch (error) {
      strapi.log.error('Could not reword review criteria', error);
    }

    // Score with AI's cost limits start as placeholders; never blocks startup.
    try {
      if (await seedAiScoringSettings()) strapi.log.info('Seeded the AI scoring settings');
    } catch (error) {
      strapi.log.error('Could not seed the AI scoring settings', error);
    }

    // Mentor starts switched off; never blocks startup.
    try {
      if (await seedMentorSettings()) strapi.log.info('Seeded the Mentor settings');
    } catch (error) {
      strapi.log.error('Could not seed the Mentor settings', error);
    }

    // Droplets already in review start at round 1; never blocks startup.
    try {
      const count = await backfillReviewRounds();
      if (count > 0) strapi.log.info(`Backfilled reviewRound on ${count} in-review droplet(s)`);
    } catch (error) {
      strapi.log.error('Could not backfill review rounds', error);
    }

    // Time zones saved with the old enum values (padded, America/Honolulu) get fixed (ODY-627); never blocks startup.
    try {
      const count = await backfillTimeZones();
      if (count > 0) strapi.log.info(`Fixed the time zone on ${count} user(s)`);
    } catch (error) {
      strapi.log.error('Could not backfill user time zones', error);
    }

    // Started enrollments with no last progress get their updatedAt (ODY-928); never blocks startup.
    try {
      const count = await backfillLastProgress();
      if (count > 0) strapi.log.info(`Backfilled lastProgressDate on ${count} enrollment(s)`);
    } catch (error) {
      strapi.log.error('Could not backfill enrollment last progress', error);
    }
  },
};
