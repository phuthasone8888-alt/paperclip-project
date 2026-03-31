/**
 * Unit tests for services/messenger.js
 */

const { sendReply, sendWhatsApp, sendFacebook, sendLine } = require('../services/messenger');

describe('messenger service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sendWhatsApp', () => {
    test('throws error when WA_PHONE_NUMBER_ID is missing', async () => {
      process.env.WA_ACCESS_TOKEN = 'token-123';
      
      await expect(sendWhatsApp('123456', 'hello')).rejects.toThrow(
        '[WhatsApp] WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN not set in .env'
      );
    });

    test('throws error when WA_ACCESS_TOKEN is missing', async () => {
      process.env.WA_PHONE_NUMBER_ID = 'phone-123';
      
      await expect(sendWhatsApp('123456', 'hello')).rejects.toThrow(
        '[WhatsApp] WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN not set in .env'
      );
    });
  });

  describe('sendFacebook', () => {
    test('throws error when FB_PAGE_ACCESS_TOKEN is missing', async () => {
      await expect(sendFacebook('user-123', 'hello')).rejects.toThrow(
        '[Facebook] FB_PAGE_ACCESS_TOKEN not set in .env'
      );
    });
  });

  describe('sendLine', () => {
    test('throws error when LINE_CHANNEL_ACCESS_TOKEN is missing', async () => {
      await expect(sendLine('U123', 'hello')).rejects.toThrow(
        '[LINE] LINE_CHANNEL_ACCESS_TOKEN not set in .env'
      );
    });
  });

  describe('sendReply', () => {
    test('routes to sendWhatsApp for WA channel', async () => {
      process.env.WA_PHONE_NUMBER_ID = 'phone-123';
      process.env.WA_ACCESS_TOKEN = 'token-abc';
      
      // Mock https.request to avoid actual network call
      const https = require('https');
      const mockRequest = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ success: true }));
            if (event === 'end') cb();
          }),
        };
        callback(mockRes);
        return {
          on: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
        };
      });

      try {
        await expect(sendReply('WA', '123456', 'hello')).resolves.toBeDefined();
      } finally {
        mockRequest.mockRestore();
      }
    });

    test('routes to sendFacebook for FB channel', async () => {
      process.env.FB_PAGE_ACCESS_TOKEN = 'fb-token-123';
      
      const https = require('https');
      const mockRequest = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ success: true }));
            if (event === 'end') cb();
          }),
        };
        callback(mockRes);
        return {
          on: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
        };
      });

      try {
        await expect(sendReply('FB', 'user-789', 'hello')).resolves.toBeDefined();
      } finally {
        mockRequest.mockRestore();
      }
    });

    test('routes to sendLine for LINE channel', async () => {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = 'line-token-123';
      
      const https = require('https');
      const mockRequest = jest.spyOn(https, 'request').mockImplementation((options, callback) => {
        const mockRes = {
          statusCode: 200,
          on: jest.fn((event, cb) => {
            if (event === 'data') cb(JSON.stringify({ success: true }));
            if (event === 'end') cb();
          }),
        };
        callback(mockRes);
        return {
          on: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
        };
      });

      try {
        await expect(sendReply('LINE', 'U456', 'hello')).resolves.toBeDefined();
      } finally {
        mockRequest.mockRestore();
      }
    });

    test('throws error for unknown channel', async () => {
      await expect(sendReply('UNKNOWN', 'recipient', 'hello')).rejects.toThrow(
        'Unknown channel: UNKNOWN'
      );
    });
  });
});
