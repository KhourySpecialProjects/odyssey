/**
 * mentor-usage router
 */

import { factories } from '@strapi/strapi';

// Read-only over REST: rows are written only by the record route (ODY-884).
export default factories.createCoreRouter('api::mentor-usage.mentor-usage', {
  only: ['find'],
});
