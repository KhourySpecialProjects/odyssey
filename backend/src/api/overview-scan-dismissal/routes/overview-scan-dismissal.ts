/**
 * overview-scan-dismissal router
 */

import { factories } from '@strapi/strapi';

// A dismissal is made or undone, never edited (ODY-905)
export default factories.createCoreRouter('api::overview-scan-dismissal.overview-scan-dismissal', {
  only: ['find', 'create', 'delete'],
});
