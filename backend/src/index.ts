import { notifyRevalidate } from './lib/revalidate';
import { isGated, touchesGroupRelations } from './lib/group-relations';

// Models watched by the global revalidation subscriber below. Phase 1 covers
// exactly what's needed to fix the reported bug (group deletes, and the
// ticket's literal repro of editing `groupAdmin` from the authorized-user
// side). Extending to another content type is one entry here plus one entry
// in `frontend/lib/revalidation-map.ts`.
const WATCHED_MODELS = ['api::group.group', 'api::authorized-user.authorized-user'];

// The field gate itself lives in ./lib/group-relations — a pure module with
// no `strapi` global, so it can be unit tested (see
// frontend/testing/backend/group-relations.test.ts). It is the subtlest
// logic here and has regressed once already.

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    // No invalidation path exists from Strapi-admin writes into the Next.js
    // data cache — every Odyssey Server Action calls revalidateTag() itself,
    // but a Content Manager edit doesn't. This subscriber closes that gap
    // for the watched models by notifying the frontend on every write, which
    // then maps the model to cache tags and revalidates them (see
    // frontend/app/api/revalidate/route.ts). See docs/plans/ODY-474.md.
    strapi.db.lifecycles.subscribe({
      models: WATCHED_MODELS,

      afterCreate(event) {
        const model = event.model.uid;
        if (isGated(model) && !touchesGroupRelations(event)) return;
        notifyRevalidate(model, 'afterCreate', event.result?.id);
      },

      afterUpdate(event) {
        const model = event.model.uid;
        if (isGated(model) && !touchesGroupRelations(event)) return;
        notifyRevalidate(model, 'afterUpdate', event.result?.id);
      },

      afterDelete(event) {
        // Deletes carry no params.data — unconditionally group-relevant.
        notifyRevalidate(event.model.uid, 'afterDelete', event.result?.id);
      },

      afterCreateMany(event) {
        const model = event.model.uid;
        if (isGated(model) && !touchesGroupRelations(event)) return;
        // *Many events return a { count }-shaped result, not an entity.
        notifyRevalidate(model, 'afterCreateMany', event.result?.id);
      },

      afterUpdateMany(event) {
        const model = event.model.uid;
        if (isGated(model) && !touchesGroupRelations(event)) return;
        notifyRevalidate(model, 'afterUpdateMany', event.result?.id);
      },

      afterDeleteMany(event) {
        // Strapi's admin multi-select delete calls deleteMany, which fires
        // this instead of per-entry afterDelete. Carries no params.data —
        // unconditionally group-relevant, same as afterDelete.
        notifyRevalidate(event.model.uid, 'afterDeleteMany', event.result?.id);
      },
    });

    // Boot-time configuration log (Settled Decision 6): makes "merged inert"
    // diagnosable. Without this, "configured and broken" looks identical to
    // "not yet configured" — both silently fall back to the 900s TTL.
    const missingVars = [
      !process.env.FRONTEND_URL && 'FRONTEND_URL',
      !process.env.REVALIDATE_SECRET && 'REVALIDATE_SECRET',
    ].filter((name): name is string => Boolean(name));

    if (missingVars.length === 0) {
      strapi.log.info(
        '[revalidate] Cache revalidation is active — Strapi-admin edits to watched models will invalidate the Next.js cache immediately.'
      );
    } else {
      strapi.log.info(
        `[revalidate] Cache revalidation is inert — missing env var(s): ${missingVars.join(', ')}. Strapi-admin edits will fall back to the 900s TTL until configured.`
      );
    }
  },
};
