
/*
 *
 * ============================================================
 * WARNING: THIS FILE HAS BEEN COMMENTED OUT
 * ============================================================
 *
 * CONTEXT:
 *
 * The lifecycles.js file has been commented out to prevent unintended side effects when starting Strapi 5 for the first time after migrating to the document service.
 *
 * STRAPI 5 introduces a new document service that handles lifecycles differently compared to previous versions. Without migrating your lifecycles to document service middlewares, you may experience issues such as:
 *
 * - `unpublish` actions triggering `delete` lifecycles for every locale with a published entity, which differs from the expected behavior in v4.
 * - `discardDraft` actions triggering both `create` and `delete` lifecycles, leading to potential confusion.
 *
 * MIGRATION GUIDE:
 *
 * For a thorough guide on migrating your lifecycles to document service middlewares, please refer to the following link:
 * [Document Services Middlewares Migration Guide](https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes/lifecycle-hooks-document-service)
 *
 * IMPORTANT:
 *
 * Simply uncommenting this file without following the migration guide may result in unexpected behavior and inconsistencies. Ensure that you have completed the migration process before re-enabling this file.
 *
 * ============================================================
 */

// import { generateSlug } from '../../../../lib/lifecycle-utils';
// import { Lesson } from '../../types';
// 
// module.exports = {
//   async beforeCreate(event) {
//     const { data } = event.params;
// 
//     if (!data.blocks && !data.blocksV2) {
//       throw new Error('Lesson must have either blocks or blocksV2 content');
//     }
// 
//     event.params.data.slug = await generateSlug('api::lesson.lesson', event.params.data);
//   },
// 
//   async beforeUpdate(event) {
//     const { data } = event.params;
// 
//     // Autosave sends non-empty content on almost every update, and then the
//     // lesson can't end up empty, so skip reading the existing row (blocksV2 +
//     // the whole blocks dynamic zone) unless the incoming data could empty it.
//     const incomingHasContent =
//       (Array.isArray(data.blocks) ? data.blocks.length > 0 : Boolean(data.blocks)) ||
//       Boolean(data.blocksV2);
// 
//     if (('blocks' in data || 'blocksV2' in data) && !incomingHasContent) {
//       const existing = (await strapi.entityService.findOne(
//         'api::lesson.lesson',
//         event.params.where.id,
//         { fields: ['blocksV2'], populate: { blocks: true } }
//       )) as Lesson | null;
// 
//       const finalBlocks = 'blocks' in data ? data.blocks : existing?.blocks;
//       const finalBlocksV2 = 'blocksV2' in data ? data.blocksV2 : existing?.blocksV2;
//       const hasBlocks = Array.isArray(finalBlocks)
//         ? finalBlocks.length > 0
//         : Boolean(finalBlocks);
// 
//       if (!hasBlocks && !finalBlocksV2) {
//         throw new Error('Lesson must have either blocks or blocksV2 content');
//       }
//     }
// 
//     if (event.params.data.regenerateSlug) {
//       event.params.data.slug = await generateSlug('api::lesson.lesson', event.params.data);
//     }
//     delete event.params.data.regenerateSlug;
//   },
// };
// 