
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
// import { formatPersonName } from '../../../../lib/lifecycle-utils';
// import { AccessRequest, AFFILIATION_LABELS } from '../../types';
// 
// module.exports = {
//   async afterCreate(event) {
//     const result = event.result as AccessRequest;
// 
//     const name = escapeSlackMrkdwn(formatPersonName({
//       firstName: result.givenName,
//       lastName: result.familyName,
//       email: result.email,
//     }));
//     const affiliation = escapeSlackMrkdwn(AFFILIATION_LABELS[result.affiliation] ?? result.affiliation ?? 'Unknown');
//     const college = escapeSlackMrkdwn(result.college ?? 'Unknown');
// 
//     const blocks: SlackBlock[] = [
//       {
//         type: 'header',
//         text: { type: 'plain_text', text: 'New Access Request', emoji: true },
//       },
//       {
//         type: 'section',
//         fields: [
//           { type: 'mrkdwn', text: `*Name:* ${name}` },
//           { type: 'mrkdwn', text: `*Email:* ${escapeSlackMrkdwn(result.email)}` },
//           { type: 'mrkdwn', text: `*Affiliation:* ${affiliation}` },
//           { type: 'mrkdwn', text: `*College:* ${college}` },
//         ],
//       },
//       { type: 'divider' },
//     ];
// 
//     // Fire-and-forget — sendSlackNotification handles its own errors and timeouts.
//     sendSlackNotification({
//       text: `New access request from ${name} (${result.email}).`,
//       blocks,
//     });
//   },
// };
// 