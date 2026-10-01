import { sendSlackNotification, escapeSlackMrkdwn, SlackBlock } from '../../../../lib/slack';
import { formatPersonName } from '../../../../lib/lifecycle-utils';
import { AccessRequest, AFFILIATION_LABELS } from '../../types';

module.exports = {
  async afterCreate(event) {
    const result = event.result as AccessRequest;

    const name = escapeSlackMrkdwn(formatPersonName({
      firstName: result.givenName,
      lastName: result.familyName,
      email: result.email,
    }));
    const affiliation = escapeSlackMrkdwn(AFFILIATION_LABELS[result.affiliation] ?? result.affiliation ?? 'Unknown');
    const college = escapeSlackMrkdwn(result.college ?? 'Unknown');

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'New Access Request', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:* ${name}` },
          { type: 'mrkdwn', text: `*Email:* ${escapeSlackMrkdwn(result.email)}` },
          { type: 'mrkdwn', text: `*Affiliation:* ${affiliation}` },
          { type: 'mrkdwn', text: `*College:* ${college}` },
        ],
      },
      { type: 'divider' },
    ];

    // Fire-and-forget — sendSlackNotification handles its own errors and timeouts.
    sendSlackNotification({
      text: `New access request from ${name} (${result.email}).`,
      blocks,
    });
  },
};
