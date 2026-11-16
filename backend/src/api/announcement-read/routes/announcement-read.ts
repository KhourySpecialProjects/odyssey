/**
 * announcement-read router
 */

import { factories } from '@strapi/strapi';

// A read mark is made or undone, never edited (ODY-786)
export default factories.createCoreRouter('api::announcement-read.announcement-read', {
  only: ['find', 'create', 'delete'],
});
