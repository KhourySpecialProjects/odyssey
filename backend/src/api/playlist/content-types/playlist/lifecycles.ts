module.exports = {
  async beforeCreate(event) {
    event.params.data.slug = await strapi.service('plugin::content-manager.uid').generateUIDField({
        contentTypeUID: "api::playlist.playlist",
        field: "slug",
        data: event.params.data
    })
  },
  async beforeUpdate(event) {
    if(event.params.data.regenerateSlug) {
      event.params.data.slug = await strapi.service('plugin::content-manager.uid').generateUIDField({
        contentTypeUID: "api::playlist.playlist",
        field: "slug",
        data: event.params.data
      })
    }
    delete event.params.data.regenerateSlug;
  },
};