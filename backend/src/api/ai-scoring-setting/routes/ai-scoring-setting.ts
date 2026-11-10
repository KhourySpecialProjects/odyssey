/**
 * ai-scoring-setting router
 */

import { factories } from '@strapi/strapi';

// Read-only over REST: the caps and prices change only in the admin.
export default factories.createCoreRouter('api::ai-scoring-setting.ai-scoring-setting', {
  only: ['find'],
});
