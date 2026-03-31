const https = require('https');
const http = require('http');

const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL || 'http://localhost:4000';
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY;
const PAPERCLIP_COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID;

/**
 * Creates a Paperclip approval request — used when CS-Agent-01
 * receives a COMPLAINT and needs CEO sign-off before replying.
 *
 * The CEO (you) sees this in your Paperclip inbox and can:
 *   APPROVE  → agent sends the drafted reply
 *   REJECT   → agent discards the reply and marks task blocked
 */
async function createEscalation({ issueId, reason, draftReply, channel, sender }) {
  if (!PAPERCLIP_API_KEY || !PAPERCLIP_COMPANY_ID) {
    console.warn('[Escalation] Missing Paperclip env vars — escalation not created');
    return null;
  }

  const description = [
    `**Escalation Reason:** ${reason}`,
    `**Channel:** ${channel}`,
    `**Sender:** ${sender}`,
    `**Issue ID:** ${issueId}`,
    '',
    '**Proposed Reply:**',
    draftReply || '_(agent has not drafted a reply yet)_',
    '',
    'Approve to send this reply. Reject to block the task for manual handling.',
  ].join('\n');

  const payload = JSON.stringify({
    issueId,
    description,
    type: 'reply_approval',
  });

  const url = new URL(`/api/companies/${PAPERCLIP_COMPANY_ID}/approvals`, PAPERCLIP_API_URL);
  const lib = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAPERCLIP_API_KEY}`,
        'X-Paperclip-Run-Id': `escalation-${issueId}-${Date.now()}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`[Escalation] Created approval for issue ${issueId}`);
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { createEscalation };
