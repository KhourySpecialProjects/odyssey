import type { Core } from "@strapi/strapi";

const SLUG_UPDATE_HANDLERS = [
  "api::droplet.droplet.update",
  "api::lesson.lesson.update",
  "api::playlist.playlist.update",
];

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    // v5-only: core update rejects unknown body.data keys; the slug lifecycles read and delete this one (ODY-700).
    strapi.contentAPI.addInputParams({
      regenerateSlug: {
        schema: (z) => z.boolean().optional(),
        matchRoute: (route) =>
          route.method === "PUT" &&
          typeof route.handler === "string" &&
          SLUG_UPDATE_HANDLERS.includes(route.handler),
      },
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
