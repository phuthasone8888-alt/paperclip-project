/**
 * test-local.js — Simulate incoming messages from all three channels
 * and verify tasks are created in Paperclip.ing.
 *
 * Usage:  node test-local.js
 * Requires server to be running on PORT 3000.
 */

const http = require('http');

const BASE = 'http://localhost:3000';

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(BASE + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('── Paperclip Automation — Local Test ──\n');

  // ── 1. Health check ──────────────────────────────────────────
  console.log('1. Health check...');
  const health = await new Promise((resolve, reject) => {
    http.get(BASE + '/', (res) => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', reject);
  });
  console.log(`   Status: ${health.status} — ${health.body}\n`);

  // ── 2. Simulate WhatsApp ORDER ───────────────────────────────
  console.log('2. Simulating WhatsApp ORDER message...');
  const wa = await post('/webhook/whatsapp', {
    entry: [{
      changes: [{
        value: {
          messages: [{
            id: 'test-wa-001',
            from: '85620541433356',   // your number: +856 20 54143356
            text: { body: 'I want to order 2 shirts please' },
          }],
        },
      }],
    }],
  });
  console.log(`   Status: ${wa.status} (expect 200)\n`);

  // ── 3. Simulate Facebook QUESTION ───────────────────────────
  console.log('3. Simulating Facebook QUESTION message...');
  const fb = await post('/webhook/facebook', {
    entry: [{
      messaging: [{
        sender: { id: 'fb-user-999' },
        message: { mid: 'test-fb-001', text: 'What are your delivery hours?' },
      }],
    }],
  });
  console.log(`   Status: ${fb.status} (expect 200)\n`);

  // ── 4. Simulate LINE COMPLAINT ───────────────────────────────
  console.log('4. Simulating LINE COMPLAINT message...');
  const line = await post('/webhook/line', {
    events: [{
      type: 'message',
      webhookEventId: 'test-line-001',
      source: { userId: 'Uabc123def456' },
      message: { type: 'text', text: 'Wrong item received! I want a refund.' },
    }],
  });
  console.log(`   Status: ${line.status} (expect 200)\n`);

  // ── 5. Test /reply endpoint (dry run — no real tokens needed) ─
  console.log('5. Testing /reply endpoint validation...');
  const replyBad = await post('/reply', { channel: 'UNKNOWN', recipientId: 'x', message: 'hi' }, {
    'X-Reply-Secret': process.env.REPLY_SECRET || 'change_this_to_a_strong_random_secret',
  });
  console.log(`   Bad channel rejected: ${replyBad.status} (expect 400)\n`);

  const replyMissing = await post('/reply', { channel: 'WA' }, {
    'X-Reply-Secret': process.env.REPLY_SECRET || 'change_this_to_a_strong_random_secret',
  });
  console.log(`   Missing fields rejected: ${replyMissing.status} (expect 400)\n`);

  console.log('── All tests complete ──');
  console.log('Check your Paperclip.ing dashboard for 3 new tasks:');
  console.log('  [WA] ORDER — 85620541433356 (your number)');
  console.log('  [FB] QUESTION — fb-user-999');
  console.log('  [LINE] COMPLAINT — Uabc123def456');
  console.log('\nNote: Tasks only appear if PAPERCLIP_* env vars are filled in .env');
}

run().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
