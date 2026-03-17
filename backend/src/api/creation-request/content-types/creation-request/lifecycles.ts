import { sendSlackNotification, SlackBlock } from '../../../../lib/slack';
import { formatPersonName } from '../../../../lib/lifecycle-utils';
import { CreationRequestWithUser } from '../../types';

module.exports = {
  async afterCreate(event) {
    const { result } = event;

    const creationRequest = (await strapi.entityService.findOne(
      'api::creation-request.creation-request',
      result.id,
      { populate: { user: { fields: ['firstName', 'lastName', 'email'] } } }
    )) as CreationRequestWithUser | null;

    const user = creationRequest?.user;
    const userName = user ? formatPersonName(user) : 'Unknown';

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'New Creator Access Request', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*User:* ${userName}` },
          { type: 'mrkdwn', text: `*Email:* ${user?.email ?? 'Unknown'}` },
        ],
      },
    ];

    if (result.motivation) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Motivation:*\n> ${result.motivation}` },
      });
    }

    if (result.dropletIdea) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Droplet Idea:*\n> ${result.dropletIdea}` },
      });
    }

    blocks.push({ type: 'divider' });

    // Fire-and-forget — sendSlackNotification handles its own errors and timeouts.
    sendSlackNotification({
      text: `New creator access request from ${userName}.`,
      blocks,
    });
  },
};
