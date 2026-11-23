/**
 * streak-day router
 */

import { factories } from '@strapi/strapi';

// Read-only over REST: rows are written only by the record route (ODY-918).
export default factories.createCoreRouter('api::streak-day.streak-day', {
  only: ['find'],
});
