/**
 * Integration tests for routes/webhooks.js using supertest
 */

const request = require('supertest');
const express = require('express');
const webhooks = require('../routes/webhooks');

describe('webhooks routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/webhook', webhooks);
  });

  describe('GET /webhook/whatsapp - verification handshake', () => {
    test('returns 200 and challenge token when verification succeeds', async () => {
      process.env.WA_VERIFY_TOKEN = 'test-wa-token';
      
      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test-wa-token',
          'hub.challenge': 'challenge-123',
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('challenge-123');
    });

    test('returns 403 when verification fails', async () => {
      process.env.WA_VERIFY_TOKEN = 'test-wa-token';
      
      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'challenge-123',
        });
      
      expect(response.status).toBe(403);
    });

    test('returns 403 when mode is not subscribe', async () => {
      const response = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'unsubscribe',
          'hub.verify_token': 'test-wa-token',
          'hub.challenge': 'challenge-123',
        });
      
      expect(response.status).toBe(403);
    });
  });

  describe('POST /webhook/whatsapp - incoming messages', () => {
    test('returns 200 for valid message payload', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          entry: [{
            changes: [{
              value: {
                messages: [{
                  id: 'msg-001',
                  from: '123456789',
                  text: { body: 'Hello' },
                }],
              },
            }],
          }],
        });
      
      expect(response.status).toBe(200);
    });

    test('returns 200 for empty messages array', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          entry: [{
            changes: [{
              value: {
                messages: [],
              },
            }],
          }],
        });
      
      expect(response.status).toBe(200);
    });

    test('returns 200 for non-text message', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          entry: [{
            changes: [{
              value: {
                messages: [{
                  id: 'msg-002',
                  from: '123456789',
                  type: 'image',
                }],
              },
            }],
          }],
        });
      
      expect(response.status).toBe(200);
    });
  });

  describe('GET /webhook/facebook - verification handshake', () => {
    test('returns 200 and challenge token when verification succeeds', async () => {
      process.env.FB_VERIFY_TOKEN = 'test-fb-token';
      
      const response = await request(app)
        .get('/webhook/facebook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test-fb-token',
          'hub.challenge': 'fb-challenge-456',
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('fb-challenge-456');
    });

    test('returns 403 when verification fails', async () => {
      process.env.FB_VERIFY_TOKEN = 'test-fb-token';
      
      const response = await request(app)
        .get('/webhook/facebook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'challenge',
        });
      
      expect(response.status).toBe(403);
    });
  });

  describe('POST /webhook/facebook - incoming messages', () => {
    test('returns 200 for valid message payload', async () => {
      const response = await request(app)
        .post('/webhook/facebook')
        .send({
          entry: [{
            messaging: [{
              sender: { id: 'fb-user-123' },
              message: { mid: 'mid-001', text: 'Hello from Facebook' },
            }],
          }],
        });
      
      expect(response.status).toBe(200);
    });

    test('returns 200 for echo message (should be ignored)', async () => {
      const response = await request(app)
        .post('/webhook/facebook')
        .send({
          entry: [{
            messaging: [{
              sender: { id: 'fb-user-123' },
              message: { mid: 'mid-002', text: 'echo', is_echo: true },
            }],
          }],
        });
      
      expect(response.status).toBe(200);
    });

    test('returns 403 when signature mismatch with FB_APP_SECRET configured', async () => {
      process.env.FB_APP_SECRET = 'secret-123';
      
      const response = await request(app)
        .post('/webhook/facebook')
        .set('X-Hub-Signature-256', 'sha256=invalid-signature')
        .send({
          entry: [{
            messaging: [{
              sender: { id: 'fb-user-123' },
              message: { mid: 'mid-003', text: 'Hello' },
            }],
          }],
        });
      
      expect(response.status).toBe(403);
    });

    test('returns 200 when no FB_APP_SECRET configured (signature check skipped)', async () => {
      delete process.env.FB_APP_SECRET;
      
      const response = await request(app)
        .post('/webhook/facebook')
        .set('X-Hub-Signature-256', 'any-signature')
        .send({
          entry: [{
            messaging: [{
              sender: { id: 'fb-user-123' },
              message: { mid: 'mid-004', text: 'Hello' },
            }],
          }],
        });
      
      expect(response.status).toBe(200);
    });
  });

  describe('POST /webhook/line - incoming messages', () => {
    test('returns 200 for valid text message', async () => {
      delete process.env.LINE_CHANNEL_SECRET; // Skip signature validation
      
      const response = await request(app)
        .post('/webhook/line')
        .send({
          events: [{
            type: 'message',
            webhookEventId: 'line-event-001',
            source: { userId: 'U-line-123' },
            message: { type: 'text', text: 'Hello from LINE' },
          }],
        });
      
      expect(response.status).toBe(200);
    });

    test('returns 200 for non-message event (should be ignored)', async () => {
      delete process.env.LINE_CHANNEL_SECRET;
      
      const response = await request(app)
        .post('/webhook/line')
        .send({
          events: [{
            type: 'follow',
            source: { userId: 'U-line-456' },
          }],
        });
      
      expect(response.status).toBe(200);
    });

    test('returns 200 for non-text message (should be ignored)', async () => {
      delete process.env.LINE_CHANNEL_SECRET;
      
      const response = await request(app)
        .post('/webhook/line')
        .send({
          events: [{
            type: 'message',
            webhookEventId: 'line-event-002',
            source: { userId: 'U-line-789' },
            message: { type: 'image' },
          }],
        });
      
      expect(response.status).toBe(200);
    });

    test('returns 403 when LINE signature validation fails', async () => {
      process.env.LINE_CHANNEL_SECRET = 'line-secret-123';
      
      const response = await request(app)
        .post('/webhook/line')
        .set('X-Line-Signature', 'invalid-signature')
        .send({
          events: [{
            type: 'message',
            webhookEventId: 'line-event-003',
            source: { userId: 'U-line-000' },
            message: { type: 'text', text: 'Hello' },
          }],
        });
      
      expect(response.status).toBe(403);
    });
  });
});
