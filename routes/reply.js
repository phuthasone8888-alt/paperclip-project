const express = require('express');
const { sendReply } = require('../services/messenger');
const { createEscalation } = require('../services/escalation');

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /reply
//
// Called by CS-Agent-01 after it processes a task.
// The agent reads the task (channel + sender + draft reply),
// then calls this endpoint to deliver the message to the customer.
//
// Request body:
// {
//   "channel":     "WA" | "FB" | "LINE",
//   "recipientId": "<phone number or user ID>",
//   "message":     "<text to send>",
//   "taskId":      "<Paperclip issue ID — for logging>",
//   "type":        "ORDER" | "QUESTION" | "COMPLAINT"  (optional — triggers escalation for COMPLAINT)
// }
//
// Security: protected by REPLY_SECRET header.
// Set REPLY_SECRET in .env and include it as X-Reply-Secret in agent requests.
// ─────────────────────────────────────────────────────────────

const VALID_CHANNELS = new Set(['WA', 'FB', 'LINE']);

router.post('/', async (req, res) => {
  // Authenticate the agent calling this endpoint
  const secret = req.headers['x-reply-secret'];
  if (process.env.REPLY_SECRET && secret !== process.env.REPLY_SECRET) {
    console.warn('[Reply] Unauthorized attempt — wrong X-Reply-Secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { channel, recipientId, message, taskId, type } = req.body;

  // Validate required fields
  if (!channel || !recipientId || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['channel', 'recipientId', 'message'],
    });
  }

  if (!VALID_CHANNELS.has(channel)) {
    return res.status(400).json({
      error: `Invalid channel. Must be one of: ${[...VALID_CHANNELS].join(', ')}`,
    });
  }

  // COMPLAINT tasks must be escalated to CEO — never auto-replied
  if (type === 'COMPLAINT') {
    console.warn(`[Reply] COMPLAINT detected — escalating task ${taskId} to CEO`);
    try {
      const approval = await createEscalation({
        issueId: taskId,
        reason: 'Customer complaint requires CEO review before reply',
        draftReply: message,
        channel,
        sender: recipientId,
      });
      return res.status(202).json({
        ok: false,
        escalated: true,
        message: 'COMPLAINT escalated to CEO for approval — reply not sent',
        approvalId: approval?.id || null,
      });
    } catch (err) {
      console.error('[Reply] Escalation failed:', err.message);
      return res.status(502).json({ error: 'Escalation failed: ' + err.message });
    }
  }

  try {
    const result = await sendReply(channel, recipientId, message);
    console.log(`[Reply] ✓ Sent via ${channel} to ${recipientId} (task: ${taskId || 'n/a'})`);
    res.json({ ok: true, channel, recipientId, taskId, result });
  } catch (err) {
    console.error(`[Reply] ✗ Failed to send via ${channel}:`, err.message);
    res.status(502).json({ error: err.message, channel, recipientId, taskId });
  }
});

module.exports = router;
