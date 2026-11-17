/**
 * overview-scan router
 */

import { factories } from '@strapi/strapi';

// A scan is a record of one run: the app saves and reads them, never edits or deletes one
export default factories.createCoreRouter('api::overview-scan.overview-scan', {
  only: ['find', 'findOne', 'create'],
});
