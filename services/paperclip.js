const https = require('https');
const http = require('http');

const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL || 'http://localhost:4000';
const PAPERCLIP_COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID;
const PAPERCLIP_PROJECT_ID = process.env.PAPERCLIP_PROJECT_ID;
const PAPERCLIP_API_KEY = process.env.PAPERCLIP_API_KEY;

// Classify message into order / question / complaint
function classifyMessage(text) {
  const t = (text || '').toLowerCase();
  if (/order|buy|purchase|สั่ง|ສັ່ງ|ซื้อ|ຊື້/.test(t)) return 'ORDER';
  if (/complaint|wrong|broken|refund|แจ้ง|ຮ້ອງ|เสีย|ລຳບາກ/.test(t)) return 'COMPLAINT';
  return 'QUESTION';
}

// Map classification to Paperclip priority
function priorityFor(type) {
  if (type === 'COMPLAINT') return 'urgent';
  if (type === 'ORDER') return 'high';
  return 'medium';
}

/**
 * Creates a task (issue) in the Paperclip.ing Customer Service project.
 * @param {object} params
 * @param {string} params.channel  - 'WA' | 'FB' | 'LINE'
 * @param {string} params.sender   - sender ID or name
 * @param {string} params.message  - raw message text
 * @param {string} [params.runId]  - optional trace ID for audit log
 */
async function createTask({ channel, sender, message, runId }) {
  if (!PAPERCLIP_COMPANY_ID || !PAPERCLIP_PROJECT_ID || !PAPERCLIP_API_KEY) {
    console.warn('[Paperclip] Missing env vars — task not created. Set PAPERCLIP_COMPANY_ID, PAPERCLIP_PROJECT_ID, PAPERCLIP_API_KEY in .env');
    return null;
  }

  const type = classifyMessage(message);
  const priority = priorityFor(type);
  const title = `[${channel}] ${type} — ${sender}`;
  const body = `**Channel:** ${channel}\n**Sender:** ${sender}\n**Type:** ${type}\n\n---\n\n${message}`;

  const payload = JSON.stringify({
    title,
    description: body,
    priority,
    projectId: PAPERCLIP_PROJECT_ID,
    status: 'todo',
  });

  const url = new URL(`/api/companies/${PAPERCLIP_COMPANY_ID}/issues`, PAPERCLIP_API_URL);
  const lib = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAPERCLIP_API_KEY}`,
        'X-Paperclip-Run-Id': runId || `webhook-${Date.now()}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { createTask, classifyMessage };
