const express = require('express');
const crypto = require('crypto');
const { createTask } = require('../services/paperclip');

const router = express.Router();

// ─────────────────────────────────────────────
// WHATSAPP (Meta Cloud API)
// ─────────────────────────────────────────────

// Verification handshake — Meta calls this once when you register the webhook
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Incoming messages
router.post('/whatsapp', (req, res) => {
  // Acknowledge immediately — Meta requires a 200 within 20s
  res.sendStatus(200);

  const entry = req.body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const messages = value?.messages;

  if (!messages || messages.length === 0) return;

  for (const msg of messages) {
    const sender = msg.from;                          // WhatsApp phone number
    const text = msg.text?.body || '[non-text message]';

    console.log(`[WhatsApp] From ${sender}: ${text}`);

    createTask({
      channel: 'WA',
      sender,
      message: text,
      runId: `wa-${msg.id}`,
    }).catch(err => console.error('[WhatsApp] Task creation failed:', err));
  }
});

// ─────────────────────────────────────────────
// FACEBOOK MESSENGER (Meta Graph API)
// ─────────────────────────────────────────────

// Verification handshake
router.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    console.log('[Facebook] Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Incoming messages — validate X-Hub-Signature-256 to confirm it's from Meta
router.post('/facebook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  if (process.env.FB_APP_SECRET && signature) {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', process.env.FB_APP_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (signature !== expected) {
      console.warn('[Facebook] Signature mismatch — request rejected');
      return res.sendStatus(403);
    }
  }

  res.sendStatus(200);

  const entries = req.body?.entry || [];
  for (const entry of entries) {
    const messaging = entry?.messaging || [];
    for (const event of messaging) {
      if (!event.message || event.message.is_echo) continue;

      const sender = event.sender?.id;
      const text = event.message?.text || '[non-text message]';

      console.log(`[Facebook] From ${sender}: ${text}`);

      createTask({
        channel: 'FB',
        sender,
        message: text,
        runId: `fb-${event.message.mid}`,
      }).catch(err => console.error('[Facebook] Task creation failed:', err));
    }
  }
});

// ─────────────────────────────────────────────
// LINE Messaging API
// ─────────────────────────────────────────────

// Validate LINE signature using HMAC-SHA256
function validateLineSignature(body, signature) {
  if (!process.env.LINE_CHANNEL_SECRET) return true; // skip if not configured yet
  const digest = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
    .update(Buffer.from(JSON.stringify(body)))
    .digest('base64');
  return digest === signature;
}

// LINE sends all events to one endpoint (no GET verification)
router.post('/line', (req, res) => {
  const signature = req.headers['x-line-signature'];
  if (!validateLineSignature(req.body, signature)) {
    console.warn('[LINE] Signature mismatch — request rejected');
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  const events = req.body?.events || [];
  for (const event of events) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue;

    const sender = event.source?.userId || 'unknown';
    const text = event.message.text;

    console.log(`[LINE] From ${sender}: ${text}`);

    createTask({
      channel: 'LINE',
      sender,
      message: text,
      runId: `line-${event.webhookEventId || Date.now()}`,
    }).catch(err => console.error('[LINE] Task creation failed:', err));
  }
});

module.exports = router;
