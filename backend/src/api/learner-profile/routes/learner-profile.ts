/**
 * learner-profile router
 */

import { factories } from '@strapi/strapi';

// No delete over REST until profile cleanup on account deletion is decided (ODY-953).
export default factories.createCoreRouter('api::learner-profile.learner-profile', {
  only: ['find', 'create', 'update'],
});
