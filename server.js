require('dotenv').config();
const express = require('express');
const path = require('path');
const webhooks = require('./routes/webhooks');
const reply = require('./routes/reply');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Paperclip automation API is running' });
});

// Tetris game (Lao)
app.get('/tetris', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tetris.html'));
});

// Channel webhooks
app.use('/webhook', webhooks);

// Agent reply endpoint — CS-Agent-01 calls this to send messages back to customers
app.use('/reply', reply);
// Routes registered:
//   GET  /webhook/whatsapp  — Meta verification handshake
//   POST /webhook/whatsapp  — Incoming WhatsApp messages
//   GET  /webhook/facebook  — Meta verification handshake
//   POST /webhook/facebook  — Incoming Facebook Messenger messages
//   POST /webhook/line      — Incoming LINE messages

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Webhook endpoints (inbound):');
  console.log(`  POST http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`  POST http://localhost:${PORT}/webhook/facebook`);
  console.log(`  POST http://localhost:${PORT}/webhook/line`);
  console.log('Reply endpoint (outbound, agent → customer):');
  console.log(`  POST http://localhost:${PORT}/reply`);
});
