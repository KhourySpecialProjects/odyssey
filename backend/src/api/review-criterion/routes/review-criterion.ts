/**
 * review-criterion router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::review-criterion.review-criterion', {
  except: ['delete'],
});
