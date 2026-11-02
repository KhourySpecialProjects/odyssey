import { escapeSlackMrkdwn, SlackBlock, SlackPayload } from './slack';
import { formatPersonName, capitalize } from './lifecycle-utils';
import { DropletWithRelations } from '../api/droplet/types';

/** Builds the review-channel message for a droplet that just entered review. */
export async function readyForReviewMessage(
  dropletId: number,
  round: number,
): Promise<SlackPayload | null> {
  const droplet = (await strapi.documents('api::droplet.droplet').findFirst({
    filters: { id: dropletId },
    fields: ['name', 'description', 'slug', 'type', 'focusArea'],
    populate: {
      lessons: { fields: ['name'] },
      authorized_users: { fields: ['firstName', 'lastName', 'email'] },
      tags: { fields: ['name'] },
    },
  })) as unknown as DropletWithRelations | null;
  if (!droplet) return null;

  const lessonNames = droplet.lessons.map((l) => escapeSlackMrkdwn(l.name));
  const tagNames = droplet.tags.map((t) => escapeSlackMrkdwn(t.name));
  const authorText =
    droplet.authorized_users.length > 0
      ? droplet.authorized_users.map((u) => escapeSlackMrkdwn(formatPersonName(u))).join(', ')
      : 'Unknown';

  const name = escapeSlackMrkdwn(droplet.name ?? 'Unknown droplet');
  const frontendUrl = process.env.FRONTEND_URL;
  const reviewUrl = frontendUrl && droplet.slug ? `${frontendUrl}/draft/d/${droplet.slug}` : null;
  const resubmitted = round >= 2;

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: resubmitted ? 'Droplet Resubmitted for Review' : 'New Droplet Ready for Review',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: reviewUrl ? `*<${reviewUrl}|${name}>*` : `*${name}*` },
    },
  ];

  if (droplet.description) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `> ${escapeSlackMrkdwn(droplet.description)}` },
    });
  }

  const fields = [
    { type: 'mrkdwn', text: `*Type:* ${escapeSlackMrkdwn(capitalize(droplet.type ?? 'unknown'))}` },
    {
      type: 'mrkdwn',
      text: `*Focus:* ${escapeSlackMrkdwn(capitalize(droplet.focusArea ?? 'unknown'))}`,
    },
    { type: 'mrkdwn', text: `*Author:* ${authorText}` },
    {
      type: 'mrkdwn',
      text: `*Lessons:* ${lessonNames.length} — ${lessonNames.length > 0 ? lessonNames.join(', ') : 'None'}`,
    },
  ];
  if (resubmitted) fields.push({ type: 'mrkdwn', text: `*Round:* ${round}` });

  blocks.push(
    { type: 'section', fields },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Tags:* ${tagNames.length > 0 ? tagNames.join(', ') : 'None'}`,
        },
      ],
    },
    { type: 'divider' },
  );

  return {
    text: resubmitted
      ? `Droplet "${name}" has been resubmitted for review (round ${round}).`
      : `Droplet "${name}" has been submitted for review.`,
    blocks,
  };
}
