const https = require('https');

// ─────────────────────────────────────────────────────────────
// Shared helper — POST JSON to an HTTPS endpoint
// ─────────────────────────────────────────────────────────────
function postJson(url, payload, headers) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────
// WHATSAPP — Meta Cloud API
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
// ─────────────────────────────────────────────────────────────
async function sendWhatsApp(recipientPhone, text) {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const token = process.env.WA_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error('[WhatsApp] WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN not set in .env');
  }

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  const result = await postJson(url, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'text',
    text: { body: text },
  }, {
    Authorization: `Bearer ${token}`,
  });

  console.log(`[WhatsApp] Sent to ${recipientPhone}`);
  return result;
}

// ─────────────────────────────────────────────────────────────
// FACEBOOK MESSENGER — Graph API
// Docs: https://developers.facebook.com/docs/messenger-platform/send-messages
// ─────────────────────────────────────────────────────────────
async function sendFacebook(recipientId, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!token) {
    throw new Error('[Facebook] FB_PAGE_ACCESS_TOKEN not set in .env');
  }

  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${token}`;
  const result = await postJson(url, {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE',
  }, {});

  console.log(`[Facebook] Sent to ${recipientId}`);
  return result;
}

// ─────────────────────────────────────────────────────────────
// LINE — Push Message API
// Using push (not reply) so messages can be sent async by the agent.
// Reply tokens expire in 30s — too short for an agent heartbeat cycle.
// Docs: https://developers.line.biz/en/reference/messaging-api/#send-push-message
// ─────────────────────────────────────────────────────────────
async function sendLine(userId, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error('[LINE] LINE_CHANNEL_ACCESS_TOKEN not set in .env');
  }

  const result = await postJson('https://api.line.me/v2/bot/message/push', {
    to: userId,
    messages: [{ type: 'text', text }],
  }, {
    Authorization: `Bearer ${token}`,
  });

  console.log(`[LINE] Sent to ${userId}`);
  return result;
}

// ─────────────────────────────────────────────────────────────
// Unified send — routes by channel code
// ─────────────────────────────────────────────────────────────
async function sendReply(channel, recipientId, text) {
  switch (channel) {
    case 'WA':   return sendWhatsApp(recipientId, text);
    case 'FB':   return sendFacebook(recipientId, text);
    case 'LINE': return sendLine(recipientId, text);
    default:     throw new Error(`Unknown channel: ${channel}`);
  }
}

module.exports = { sendReply, sendWhatsApp, sendFacebook, sendLine };
