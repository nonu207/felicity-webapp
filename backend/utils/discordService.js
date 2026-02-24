/**
 * Discord Webhook Service
 * Sends rich embeds to Discord channels via organizer-configured webhook URLs.
 */

const DISCORD_WEBHOOK_REGEX = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/;

/**
 * Validate a Discord webhook URL format.
 * @param {string} url
 * @returns {boolean}
 */
const isValidWebhookUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return DISCORD_WEBHOOK_REGEX.test(url.trim());
};

/**
 * Send an embed payload to a Discord webhook (fire-and-forget).
 * @param {string} webhookUrl  – full Discord webhook URL
 * @param {object} payload     – Discord webhook JSON body (embeds, content, etc.)
 * @returns {Promise<boolean>} – true if sent successfully
 */
const sendDiscordWebhook = async (webhookUrl, payload) => {
  try {
    if (!isValidWebhookUrl(webhookUrl)) return false;
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)');
      console.warn(`[Discord] Webhook ${res.status}: ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Discord] Webhook error:', err.message);
    return false;
  }
};

// Embed helpers

/**
 * Send a test embed to verify the webhook works.
 */
const sendTestEmbed = async (webhookUrl, organizerName) => {
  return sendDiscordWebhook(webhookUrl, {
    embeds: [{
      title: '✅ Webhook Connected!',
      description: `This Discord channel is now linked to **${organizerName}** on Felicity. New event announcements will appear here automatically.`,
      color: 0x22C55E, // green
      footer: { text: 'Felicity Event Management — IIIT Hyderabad' },
      timestamp: new Date().toISOString(),
    }],
  });
};

/**
 * Send a rich embed when a new event is published.
 */
const sendEventPublishedEmbed = async (webhookUrl, event, organizerName) => {
  const fields = [
    { name: '📂 Type', value: event.eventType || 'General', inline: true },
    { name: '💰 Fee', value: event.registrationFee ? `₹${event.registrationFee}` : 'Free', inline: true },
    { name: '🎯 Eligibility', value: event.eligibility === 'all' ? 'Open to All' : event.eligibility === 'iiit-only' ? 'IIIT Only' : 'External Only', inline: true },
    { name: '📅 Start', value: new Date(event.startDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), inline: true },
    { name: '📅 End', value: new Date(event.endDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), inline: true },
    { name: '⏰ Reg. Deadline', value: new Date(event.registrationDeadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), inline: true },
  ];

  if (event.registrationLimit) {
    fields.push({ name: '👥 Max Participants', value: `${event.registrationLimit}`, inline: true });
  }
  if (event.location) {
    fields.push({ name: '📍 Venue', value: event.location, inline: true });
  }
  if (event.eventTags?.length) {
    fields.push({ name: '🏷️ Tags', value: event.eventTags.join(', '), inline: false });
  }

  return sendDiscordWebhook(webhookUrl, {
    content: '🎉 **New Event Published!**',
    embeds: [{
      title: `📢 ${event.eventName}`,
      description: (event.description || 'No description provided.').slice(0, 400),
      color: 0x7C3AED, // purple
      fields,
      footer: { text: `Published by ${organizerName} • Felicity` },
      timestamp: new Date().toISOString(),
    }],
  });
};

/**
 * Send embed when registrations are closed for an event.
 */
const sendEventClosedEmbed = async (webhookUrl, event, organizerName) => {
  return sendDiscordWebhook(webhookUrl, {
    embeds: [{
      title: `🔒 Registrations Closed: ${event.eventName}`,
      description: `Registrations for **${event.eventName}** have been closed by the organizer.`,
      color: 0xEF4444, // red
      fields: [
        { name: 'Total Registrations', value: `${event.registrationCount || 0}`, inline: true },
        { name: 'Event Date', value: new Date(event.startDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), inline: true },
      ],
      footer: { text: `${organizerName} • Felicity` },
      timestamp: new Date().toISOString(),
    }],
  });
};

/**
 * Send embed when an event is marked as completed.
 */
const sendEventCompletedEmbed = async (webhookUrl, event, organizerName) => {
  return sendDiscordWebhook(webhookUrl, {
    embeds: [{
      title: `🏁 Event Completed: ${event.eventName}`,
      description: `**${event.eventName}** has been marked as completed. Thanks to all participants!`,
      color: 0x3B82F6, // blue
      fields: [
        { name: 'Total Registrations', value: `${event.registrationCount || 0}`, inline: true },
        { name: 'Event Type', value: event.eventType || 'General', inline: true },
      ],
      footer: { text: `${organizerName} • Felicity` },
      timestamp: new Date().toISOString(),
    }],
  });
};

/**
 * Send embed when a registration milestone is reached.
 */
const sendRegistrationMilestoneEmbed = async (webhookUrl, event, count, organizerName) => {
  return sendDiscordWebhook(webhookUrl, {
    embeds: [{
      title: `🎯 Milestone Reached: ${count} Registrations!`,
      description: `**${event.eventName}** has reached **${count}** registrations!`,
      color: 0xF59E0B, // amber
      fields: [
        { name: 'Event', value: event.eventName, inline: true },
        { name: 'Fee', value: event.registrationFee ? `₹${event.registrationFee}` : 'Free', inline: true },
      ],
      footer: { text: `${organizerName} • Felicity` },
      timestamp: new Date().toISOString(),
    }],
  });
};

/**
 * Send embed when a published event is updated (description, deadline, limit).
 * @param {string} webhookUrl
 * @param {object} event          – the saved event document
 * @param {string[]} changedFields – human-readable list of what changed
 * @param {string} organizerName
 */
const sendEventUpdatedEmbed = async (webhookUrl, event, changedFields, organizerName) => {
  return sendDiscordWebhook(webhookUrl, {
    content: '📝 **Event Updated!**',
    embeds: [{
      title: `🔄 ${event.eventName}`,
      description: `The following details have been updated:\n• ${changedFields.join('\n• ')}`,
      color: 0xF59E0B, // amber
      fields: [
        { name: '📅 Reg. Deadline', value: new Date(event.registrationDeadline).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), inline: true },
        { name: '👥 Reg. Limit', value: event.registrationLimit ? `${event.registrationLimit}` : 'Unlimited', inline: true },
      ],
      footer: { text: `Updated by ${organizerName} • Felicity` },
      timestamp: new Date().toISOString(),
    }],
  });
};

module.exports = {
  isValidWebhookUrl,
  sendDiscordWebhook,
  sendTestEmbed,
  sendEventPublishedEmbed,
  sendEventClosedEmbed,
  sendEventCompletedEmbed,
  sendEventUpdatedEmbed,
  sendRegistrationMilestoneEmbed,
};
