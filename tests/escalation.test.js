/**
 * Unit tests for services/escalation.js
 */

const { createEscalation } = require('../services/escalation');

describe('createEscalation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns null when PAPERCLIP_API_KEY is missing', async () => {
    process.env.PAPERCLIP_COMPANY_ID = 'comp-123';
    
    const result = await createEscalation({
      issueId: 'issue-001',
      reason: 'Customer complaint',
      draftReply: 'We apologize',
      channel: 'WA',
      sender: '123456',
    });
    
    expect(result).toBeNull();
  });

  test('returns null when PAPERCLIP_COMPANY_ID is missing', async () => {
    process.env.PAPERCLIP_API_KEY = 'key-abc';
    
    const result = await createEscalation({
      issueId: 'issue-001',
      reason: 'Customer complaint',
      draftReply: 'We apologize',
      channel: 'FB',
      sender: 'user-789',
    });
    
    expect(result).toBeNull();
  });

  test('logs warning when env vars are missing', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    process.env.PAPERCLIP_API_KEY = 'key-abc';
    // Missing PAPERCLIP_COMPANY_ID
    
    await createEscalation({
      issueId: 'issue-001',
      reason: 'Test reason',
      draftReply: 'Test reply',
      channel: 'LINE',
      sender: 'U123',
    });
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Escalation] Missing Paperclip env vars — escalation not created'
    );
    
    consoleWarnSpy.mockRestore();
  });
});
