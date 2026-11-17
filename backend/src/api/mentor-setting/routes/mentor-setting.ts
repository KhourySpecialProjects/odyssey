/**
 * mentor-setting router
 */

import { factories } from '@strapi/strapi';

// Read-only over REST: the switch, pilot groups and limits change only in the admin.
export default factories.createCoreRouter('api::mentor-setting.mentor-setting', {
  only: ['find'],
});
