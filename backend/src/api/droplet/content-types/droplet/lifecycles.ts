
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

// import { sendSlackNotification, escapeSlackMrkdwn, SlackBlock } from '../../../../lib/slack';
// import { generateSlug, formatPersonName, capitalize } from '../../../../lib/lifecycle-utils';
// import { DropletStatus, DropletWithRelations } from '../../types';
// 
// module.exports = {
//   async beforeCreate(event) {
//     event.params.data.slug = await generateSlug('api::droplet.droplet', event.params.data);
//   },
// 
//   async beforeUpdate(event) {
//     if (event.params.data.regenerateSlug) {
//       event.params.data.slug = await generateSlug('api::droplet.droplet', event.params.data);
//     }
//     delete event.params.data.regenerateSlug;
// 
//     // Only capture previous status when the update touches the status field.
//     if ('status' in event.params.data) {
//       const existing = await strapi.entityService.findOne(
//         'api::droplet.droplet',
//         event.params.where.id,
//         { fields: ['status'] }
//       );
//       event.state = { previousStatus: existing ? (existing.status as DropletStatus) : null };
//     }
//   },
// 
//   async afterUpdate(event) {
//     const { result } = event;
//     const prevStatus = event.state?.previousStatus as DropletStatus | null | undefined;
// 
//     // Only fire when status transitions *into* 'edit'.
//     if (result.status !== 'edit' || prevStatus === 'edit' || prevStatus === undefined) return;
// 
//     const droplet = (await strapi.entityService.findOne('api::droplet.droplet', result.id, {
//       populate: {
//         lessons: { fields: ['name'] },
//         authorized_users: { fields: ['firstName', 'lastName', 'email'] },
//         tags: { fields: ['name'] },
//       },
//     })) as DropletWithRelations | null;
// 
//     if (!droplet) return;
// 
//     const lessonNames = droplet.lessons.map((l) => escapeSlackMrkdwn(l.name));
//     const tagNames = droplet.tags.map((t) => escapeSlackMrkdwn(t.name));
//     const authorText =
//       droplet.authorized_users.length > 0
//         ? droplet.authorized_users.map((u) => escapeSlackMrkdwn(formatPersonName(u))).join(', ')
//         : 'Unknown';
// 
//     const dropletName = escapeSlackMrkdwn(result.name ?? 'Unknown droplet');
//     const frontendUrl = process.env.FRONTEND_URL;
//     const reviewUrl =
//       frontendUrl && result.slug ? `${frontendUrl}/draft/d/${result.slug}` : null;
// 
//     const blocks: SlackBlock[] = [
//       {
//         type: 'header',
//         text: { type: 'plain_text', text: 'New Droplet Ready for Review', emoji: true },
//       },
//       {
//         type: 'section',
//         text: { type: 'mrkdwn', text: `*<${reviewUrl}|${dropletName}>*` },
//       },
//     ];
// 
//     if (result.description) {
//       blocks.push({
//         type: 'section',
//         text: { type: 'mrkdwn', text: `> ${escapeSlackMrkdwn(result.description)}` },
//       });
//     }
// 
//     blocks.push(
//       {
//         type: 'section',
//         fields: [
//           { type: 'mrkdwn', text: `*Type:* ${escapeSlackMrkdwn(capitalize(result.type ?? 'unknown'))}` },
//           { type: 'mrkdwn', text: `*Focus:* ${escapeSlackMrkdwn(capitalize(result.focusArea ?? 'unknown'))}` },
//           { type: 'mrkdwn', text: `*Author:* ${authorText}` },
//           {
//             type: 'mrkdwn',
//             text: `*Lessons:* ${lessonNames.length} — ${lessonNames.length > 0 ? lessonNames.join(', ') : 'None'}`,
//           },
//         ],
//       },
//       {
//         type: 'context',
//         elements: [
//           {
//             type: 'mrkdwn',
//             text: `*Tags:* ${tagNames.length > 0 ? tagNames.join(', ') : 'None'}`,
//           },
//         ],
//       },
//       { type: 'divider' }
//     );
// 
//     // Fire-and-forget — sendSlackNotification handles its own errors and timeouts.
//     sendSlackNotification({
//       text: `Droplet "${dropletName}" has been submitted for review.`,
//       blocks,
//     });
//   },
// };
// 