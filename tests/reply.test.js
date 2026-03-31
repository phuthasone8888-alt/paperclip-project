/**
 * Unit tests for routes/reply.js using supertest
 */

const request = require('supertest');
const express = require('express');

// Mock services before requiring the route
jest.mock('../services/messenger');
jest.mock('../services/escalation');

const messenger = require('../services/messenger');
const escalation = require('../services/escalation');
const reply = require('../routes/reply');

describe('reply routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/reply', reply);
    
    // Reset all mocks between tests
    jest.clearAllMocks();
  });

  describe('POST /reply - authentication', () => {
    test('returns 401 when X-Reply-Secret is wrong', async () => {
      process.env.REPLY_SECRET = 'correct-secret';
      
      const response = await request(app)
        .post('/reply')
        .set('X-Reply-Secret', 'wrong-secret')
        .send({
          channel: 'WA',
          recipientId: '123456',
          message: 'Hello',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('succeeds when X-Reply-Secret is correct', async () => {
      process.env.REPLY_SECRET = 'correct-secret';
      process.env.WA_PHONE_NUMBER_ID = 'phone-123';
      process.env.WA_ACCESS_TOKEN = 'token-abc';
      
      messenger.sendReply.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/reply')
        .set('X-Reply-Secret', 'correct-secret')
        .send({
          channel: 'WA',
          recipientId: '123456',
          message: 'Hello',
          taskId: 'task-001',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      
      delete process.env.WA_PHONE_NUMBER_ID;
      delete process.env.WA_ACCESS_TOKEN;
    });

    test('succeeds when REPLY_SECRET is not configured (no auth required)', async () => {
      delete process.env.REPLY_SECRET;
      process.env.WA_PHONE_NUMBER_ID = 'phone-123';
      process.env.WA_ACCESS_TOKEN = 'token-abc';
      
      messenger.sendReply.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'WA',
          recipientId: '123456',
          message: 'Hello',
        });
      
      expect(response.status).toBe(200);
      
      delete process.env.WA_PHONE_NUMBER_ID;
      delete process.env.WA_ACCESS_TOKEN;
    });
  });

  describe('POST /reply - validation', () => {
    beforeEach(() => {
      delete process.env.REPLY_SECRET; // Skip auth for validation tests
    });

    test('returns 400 when channel is missing', async () => {
      const response = await request(app)
        .post('/reply')
        .send({
          recipientId: '123456',
          message: 'Hello',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    test('returns 400 when recipientId is missing', async () => {
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'WA',
          message: 'Hello',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    test('returns 400 when message is missing', async () => {
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'WA',
          recipientId: '123456',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    test('returns 400 when channel is invalid', async () => {
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'INVALID',
          recipientId: '123456',
          message: 'Hello',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid channel');
    });
  });

  describe('POST /reply - complaint escalation', () => {
    beforeEach(() => {
      delete process.env.REPLY_SECRET;
    });

    test('returns 202 and escalates COMPLAINT type messages', async () => {
      escalation.createEscalation.mockResolvedValue({ id: 'approval-123' });
      
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'WA',
          recipientId: '123456',
          message: 'We apologize',
          taskId: 'task-001',
          type: 'COMPLAINT',
        });
      
      expect(response.status).toBe(202);
      expect(response.body.ok).toBe(false);
      expect(response.body.escalated).toBe(true);
      expect(response.body.approvalId).toBe('approval-123');
    });

    test('returns 502 when escalation fails', async () => {
      escalation.createEscalation.mockRejectedValue(new Error('API error'));
      
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'FB',
          recipientId: 'user-789',
          message: 'Sorry about that',
          taskId: 'task-002',
          type: 'COMPLAINT',
        });
      
      expect(response.status).toBe(502);
      expect(response.body.error).toContain('Escalation failed');
    });
  });

  describe('POST /reply - successful reply', () => {
    beforeEach(() => {
      delete process.env.REPLY_SECRET;
      // Set up required env vars for each channel
      process.env.WA_PHONE_NUMBER_ID = 'phone-123';
      process.env.WA_ACCESS_TOKEN = 'token-wa';
      process.env.FB_PAGE_ACCESS_TOKEN = 'token-fb';
      process.env.LINE_CHANNEL_ACCESS_TOKEN = 'token-line';
    });

    afterEach(() => {
      delete process.env.WA_PHONE_NUMBER_ID;
      delete process.env.WA_ACCESS_TOKEN;
      delete process.env.FB_PAGE_ACCESS_TOKEN;
      delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    });

    test('sends reply for WA channel ORDER type', async () => {
      messenger.sendReply.mockResolvedValue({ messageId: 'wa-msg-123' });
      
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'WA',
          recipientId: '85620541433356',
          message: 'Your order has been confirmed',
          taskId: 'task-003',
          type: 'ORDER',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.channel).toBe('WA');
    });

    test('sends reply for FB channel QUESTION type', async () => {
      messenger.sendReply.mockResolvedValue({ messageId: 'fb-msg-456' });
      
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'FB',
          recipientId: 'fb-user-999',
          message: 'Our delivery hours are 9am-5pm',
          taskId: 'task-004',
          type: 'QUESTION',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('sends reply for LINE channel without type', async () => {
      messenger.sendReply.mockResolvedValue({ messageId: 'line-msg-789' });
      
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'LINE',
          recipientId: 'U123abc',
          message: 'Thank you for contacting us',
          taskId: 'task-005',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('returns 502 when sendReply fails', async () => {
      messenger.sendReply.mockRejectedValue(new Error('API unavailable'));
      
      const response = await request(app)
        .post('/reply')
        .send({
          channel: 'WA',
          recipientId: '123456',
          message: 'Hello',
        });
      
      expect(response.status).toBe(502);
      expect(response.body.error).toBe('API unavailable');
    });
  });
});
