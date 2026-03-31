# Paperclip Automation API

AI-powered customer service automation for WhatsApp, Facebook Messenger, and LINE — built for Laos/Thailand retail operations.

## What It Does

- Receives messages from WhatsApp, Facebook Messenger, and LINE via webhooks
- Classifies each message as `ORDER`, `QUESTION`, or `COMPLAINT` (Thai + Lao keyword support)
- Creates a task in Paperclip.ing for CS-Agent-01 to process
- Sends replies back to customers via each platform's API
- Escalates complaints to the CEO (shop owner) for approval before any reply is sent

## Project Structure

```
├── server.js               # Express app entry point
├── routes/
│   ├── webhooks.js         # Inbound: receive messages from all channels
│   └── reply.js            # Outbound: send replies + COMPLAINT escalation gate
├── services/
│   ├── paperclip.js        # Create tasks in Paperclip.ing
│   ├── messenger.js        # Send replies via WhatsApp / Facebook / LINE APIs
│   └── escalation.js       # Create CEO approval requests for complaints
├── AGENTS.md               # CS-Agent-01 instructions for Paperclip.ing
├── ecosystem.config.js     # PM2 config for production
└── test-local.js           # End-to-end local test script
```

## Webhook Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/webhook/whatsapp` | WhatsApp Cloud API |
| GET/POST | `/webhook/facebook` | Facebook Messenger |
| POST | `/webhook/line` | LINE Messaging API |
| POST | `/reply` | Agent → customer reply (internal) |

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env` and fill in all credentials:
```
PAPERCLIP_API_KEY=
PAPERCLIP_COMPANY_ID=
PAPERCLIP_PROJECT_ID=
WA_PHONE_NUMBER_ID=
WA_ACCESS_TOKEN=
FB_APP_SECRET=
FB_PAGE_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
REPLY_SECRET=
```

### 3. Run locally
```bash
npm run dev
```

### 4. Test
```bash
node test-local.js
```

### 5. Deploy to production (Railway)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## Message Flow

```
Customer → WhatsApp/FB/LINE webhook
         → Classified (ORDER / QUESTION / COMPLAINT)
         → Paperclip.ing task created
         → CS-Agent-01 picks up on heartbeat
         → POST /reply
         → ORDER/QUESTION: reply sent immediately
         → COMPLAINT: CEO approval required first
```

## Coverage Schedule (GMT+7)

| Time | Handler | Heartbeat |
|------|---------|-----------|
| 8am – 9pm | CS-Agent-01 | Every 5 min |
| 9pm – 8am | CS-Agent-01 | Every 30 min |
