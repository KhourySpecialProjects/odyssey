module.exports = {
  async beforeCreate(event) {
    console.log("got here ")
    event.params.data.slug = await strapi.service('plugin::content-manager.uid').generateUIDField({
        contentTypeUID: "api::droplet.droplet",
        field: "slug",
        data: event.params.data
    })
  },
  async beforeUpdate(event) {
    console.log("got here")
    event.params.data.slug = await strapi.service('plugin::content-manager.uid').generateUIDField({
        contentTypeUID: "api::droplet.droplet",
        field: "slug",
        data: event.params.data
    })
  },
};