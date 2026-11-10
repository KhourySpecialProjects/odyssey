import { sendSlackNotification, escapeSlackMrkdwn, SlackBlock } from '../../../../lib/slack';
import {
  generateSlug,
  formatPersonName,
  capitalize,
  markClaimedVoyageNodesAuthored,
} from '../../../../lib/lifecycle-utils';
import { DropletStatus, DropletWithRelations } from '../../types';

module.exports = {
  async beforeCreate(event) {
    event.params.data.slug = await generateSlug('api::droplet.droplet', event.params.data);
    // Server-owned submission counter; client values are ignored.
    event.params.data.reviewRound = event.params.data.inReview === true ? 1 : 0;
  },

  async beforeUpdate(event) {
    if (event.params.data.regenerateSlug) {
      event.params.data.slug = await generateSlug('api::droplet.droplet', event.params.data);
    }
    delete event.params.data.regenerateSlug;

    // Server-owned counter: drop any client value, then bump when inReview turns true.
    delete event.params.data.reviewRound;

    const data = event.params.data;
    if ('status' in data || data.inReview === true) {
      // Resolve the row by numeric id, else documentId (Query Engine callers). Neither: skip, so
      // afterUpdate sees no previousStatus and nothing bumps.
      const { id, documentId } = event.params.where ?? {};
      const filters = id !== undefined ? { id } : documentId ? { documentId } : null;
      const existing = filters
        ? await strapi.documents('api::droplet.droplet').findFirst({
            filters,
            fields: ['status', 'inReview', 'reviewRound'],
          })
        : null;
      // Only capture previous status when the update touches the status field.
      if ('status' in data && filters) {
        event.state = { previousStatus: existing ? (existing.status as DropletStatus) : null };
      }
      if (data.inReview === true && existing && existing.inReview !== true) {
        data.reviewRound = (existing.reviewRound ?? 0) + 1;
      }
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    const prevStatus = event.state?.previousStatus as DropletStatus | null | undefined;

    // Publishing a claimed voyage droplet finishes the claim. Logged instead of
    // thrown: the droplet is already saved, so the publish must not fail here.
    if (result.status === 'published' && prevStatus !== undefined && prevStatus !== 'published') {
      try {
        await markClaimedVoyageNodesAuthored({ id: result.id });
      } catch (error) {
        strapi.log.error(`Could not mark voyage claims authored for droplet ${result.id}`, error);
      }
    }

    // Only fire when status transitions *into* 'edit'.
    if (result.status !== 'edit' || prevStatus === 'edit' || prevStatus === undefined) return;

    // After hooks have the result's documentId, so a plain findOne works.
    const droplet = (await strapi.documents('api::droplet.droplet').findOne({
      documentId: result.documentId,
      populate: {
        lessons: { fields: ['name'] },
        authorized_users: { fields: ['firstName', 'lastName', 'email'] },
        tags: { fields: ['name'] },
      },
    })) as unknown as DropletWithRelations | null;

    if (!droplet) return;

    const lessonNames = droplet.lessons.map((l) => escapeSlackMrkdwn(l.name));
    const tagNames = droplet.tags.map((t) => escapeSlackMrkdwn(t.name));
    const authorText =
      droplet.authorized_users.length > 0
        ? droplet.authorized_users.map((u) => escapeSlackMrkdwn(formatPersonName(u))).join(', ')
        : 'Unknown';

    const dropletName = escapeSlackMrkdwn(result.name ?? 'Unknown droplet');
    const frontendUrl = process.env.FRONTEND_URL;
    const reviewUrl =
      frontendUrl && result.slug ? `${frontendUrl}/draft/d/${result.slug}` : null;

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'New Droplet Ready for Review', emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*<${reviewUrl}|${dropletName}>*` },
      },
    ];

    if (result.description) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `> ${escapeSlackMrkdwn(result.description)}` },
      });
    }

    blocks.push(
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Type:* ${escapeSlackMrkdwn(capitalize(result.type ?? 'unknown'))}` },
          { type: 'mrkdwn', text: `*Focus:* ${escapeSlackMrkdwn(capitalize(result.focusArea ?? 'unknown'))}` },
          { type: 'mrkdwn', text: `*Author:* ${authorText}` },
          {
            type: 'mrkdwn',
            text: `*Lessons:* ${lessonNames.length} — ${lessonNames.length > 0 ? lessonNames.join(', ') : 'None'}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Tags:* ${tagNames.length > 0 ? tagNames.join(', ') : 'None'}`,
          },
        ],
      },
      { type: 'divider' }
    );

    // Fire-and-forget — sendSlackNotification handles its own errors and timeouts.
    sendSlackNotification({
      text: `Droplet "${dropletName}" has been submitted for review.`,
      blocks,
    });
  },
};
