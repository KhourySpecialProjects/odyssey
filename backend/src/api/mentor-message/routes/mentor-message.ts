/**
 * mentor-message router
 */

import { factories } from '@strapi/strapi';

// No role is granted these routes: only the Next.js server's service token reaches them (ODY-937).
export default factories.createCoreRouter('api::mentor-message.mentor-message', {
  only: ['find', 'findOne', 'create', 'update', 'delete'],
});
