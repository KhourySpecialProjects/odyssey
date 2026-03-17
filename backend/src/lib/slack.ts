/**
 * Slack webhook utility
 *
 * Sends a structured Block Kit message to the configured SLACK_WEBHOOK_URL.
 * Set SLACK_WEBHOOK_URL in backend/.env (or the ECS task environment) to
 * enable notifications; if the variable is absent the function is a no-op so
 * the app never fails due to a missing webhook.
 */

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export interface SlackPayload {
  text: string; // Fallback text (notifications / accessibility)
  blocks?: SlackBlock[];
}

/**
 * Post a message to the admin Slack channel via an Incoming Webhook.
 * Silently swallows errors so a Slack outage never breaks a Strapi request.
 * Aborts after 5 s to avoid hanging lifecycle hooks.
 */
export async function sendSlackNotification(payload: SlackPayload): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      strapi.log.warn(`[slack] Webhook responded with ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    strapi.log.warn('[slack] Failed to send notification:', err);
  } finally {
    clearTimeout(timeout);
  }
}
