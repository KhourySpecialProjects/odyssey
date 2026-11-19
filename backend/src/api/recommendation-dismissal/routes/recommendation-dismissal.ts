import { factories } from '@strapi/strapi';

// Made once per student and droplet, never edited (ODY-954)
export default factories.createCoreRouter('api::recommendation-dismissal.recommendation-dismissal', {
  only: ['find', 'create'],
});
