import { sendSlackNotification, SlackBlock } from '../../../../lib/slack';
import { generateSlug, formatPersonName, capitalize } from '../../../../lib/lifecycle-utils';
import { DropletStatus, DropletWithRelations } from '../../types';

module.exports = {
  async beforeCreate(event) {
    event.params.data.slug = await generateSlug('api::droplet.droplet', event.params.data);
  },

  async beforeUpdate(event) {
    if (event.params.data.regenerateSlug) {
      event.params.data.slug = await generateSlug('api::droplet.droplet', event.params.data);
    }
    delete event.params.data.regenerateSlug;

    // Only capture previous status when the update touches the status field.
    if ('status' in event.params.data) {
      const existing = await strapi.entityService.findOne(
        'api::droplet.droplet',
        event.params.where.id,
        { fields: ['status'] }
      );
      event.state = { previousStatus: existing ? (existing.status as DropletStatus) : null };
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    const prevStatus = event.state?.previousStatus as DropletStatus | null | undefined;

    // Only fire when status transitions *into* 'edit'.
    if (result.status !== 'edit' || prevStatus === 'edit' || prevStatus === undefined) return;

    const droplet = (await strapi.entityService.findOne('api::droplet.droplet', result.id, {
      populate: {
        lessons: { fields: ['name'] },
        authorized_users: { fields: ['firstName', 'lastName', 'email'] },
        tags: { fields: ['name'] },
      },
    })) as DropletWithRelations | null;

    if (!droplet) return;

    const lessonNames = droplet.lessons.map((l) => l.name);
    const tagNames = droplet.tags.map((t) => t.name);
    const authorText =
      droplet.authorized_users.length > 0
        ? droplet.authorized_users.map(formatPersonName).join(', ')
        : 'Unknown';

    const dropletName = result.name ?? 'Unknown droplet';
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
        text: { type: 'mrkdwn', text: `> ${result.description}` },
      });
    }

    blocks.push(
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Type:* ${capitalize(result.type ?? 'unknown')}` },
          { type: 'mrkdwn', text: `*Focus:* ${capitalize(result.focusArea ?? 'unknown')}` },
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
