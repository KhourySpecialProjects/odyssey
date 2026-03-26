import { generateSlug } from '../../../../lib/lifecycle-utils';

module.exports = {
  async beforeCreate(event) {
    event.params.data.slug = await generateSlug('api::playlist.playlist', event.params.data);
  },

  async beforeUpdate(event) {
    if (event.params.data.regenerateSlug) {
      event.params.data.slug = await generateSlug('api::playlist.playlist', event.params.data);
    }
    delete event.params.data.regenerateSlug;
  },
};
