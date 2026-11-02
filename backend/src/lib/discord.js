const MAX_TEXT = 1800;

function safeText(value) {
  return String(value ?? '').replace(/@/g, '@\u200b').slice(0, MAX_TEXT);
}

export function isDiscordWebhookConfigured() {
  const raw = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return ['discord.com', 'discordapp.com'].includes(url.hostname) && url.pathname.startsWith('/api/webhooks/');
  } catch {
    return false;
  }
}

/** Best-effort Discord webhook. Business transactions never depend on Discord availability. */
export async function sendDiscordNotification({ title, description, color = 0xB32635 }) {
  const raw = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!raw) return false;
  let url;
  try { url = new URL(raw); } catch {
    console.warn('DISCORD_WEBHOOK_URL tidak valid; notifikasi Discord dilewati.');
    return false;
  }
  if (!['discord.com', 'discordapp.com'].includes(url.hostname) || !url.pathname.startsWith('/api/webhooks/')) {
    console.warn('DISCORD_WEBHOOK_URL bukan URL webhook Discord yang valid; notifikasi dilewati.');
    return false;
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [{
          title: safeText(title || '30sFams Notification'),
          description: safeText(description),
          color,
          footer: { text: '30sFams Order Portal' },
          timestamp: new Date().toISOString(),
        }],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn(`Discord webhook mengembalikan HTTP ${response.status}.`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`Notifikasi Discord gagal dikirim: ${error.name || 'NetworkError'}.`);
    return false;
  }
}
