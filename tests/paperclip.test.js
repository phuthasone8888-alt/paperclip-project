/**
 * Unit tests for services/paperclip.js
 */

const { classifyMessage, createTask } = require('../services/paperclip');

describe('classifyMessage', () => {
  test('classifies ORDER messages in English', () => {
    expect(classifyMessage('I want to order 2 shirts')).toBe('ORDER');
    expect(classifyMessage('buy now please')).toBe('ORDER');
    expect(classifyMessage('purchase a product')).toBe('ORDER');
  });

  test('classifies ORDER messages in Lao', () => {
    expect(classifyMessage('ຂ້ອຍຢາກສັ່ງຊື້ເສື້ອ 2 ໂຕ')).toBe('ORDER');
    expect(classifyMessage('ຢາກຊື້ສິນຄ້າ')).toBe('ORDER');
  });

  test('classifies COMPLAINT messages in English', () => {
    expect(classifyMessage('complaint about wrong item')).toBe('COMPLAINT');
    expect(classifyMessage('broken product need refund')).toBe('COMPLAINT');
    expect(classifyMessage('wrong delivery')).toBe('COMPLAINT');
  });

  test('classifies COMPLAINT messages in Lao', () => {
    // Note: The regex patterns in paperclip.js may not match all Lao text correctly
    // These tests verify the actual behavior of the classifyMessage function
    expect(classifyMessage('ຂໍຮ້ອງຮຽນ')).toBe('COMPLAINT'); // Contains ຮ້ອງຮຽນ (complaint)
    expect(classifyMessage('ລຳບາກ')).toBe('COMPLAINT'); // Contains ລຳບາກ (trouble/hardship)
  });

  test('classifies QUESTION messages by default', () => {
    expect(classifyMessage('What are your hours?')).toBe('QUESTION');
    expect(classifyMessage('Hello there')).toBe('QUESTION');
    expect(classifyMessage('')).toBe('QUESTION');
    expect(classifyMessage(null)).toBe('QUESTION');
  });
});

describe('createTask', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns null when PAPERCLIP_COMPANY_ID is missing', async () => {
    process.env.PAPERCLIP_PROJECT_ID = 'proj-123';
    process.env.PAPERCLIP_API_KEY = 'key-abc';
    
    const result = await createTask({
      channel: 'WA',
      sender: '123456',
      message: 'test message',
    });
    
    expect(result).toBeNull();
  });

  test('returns null when PAPERCLIP_PROJECT_ID is missing', async () => {
    process.env.PAPERCLIP_COMPANY_ID = 'comp-123';
    process.env.PAPERCLIP_API_KEY = 'key-abc';
    
    const result = await createTask({
      channel: 'FB',
      sender: 'user-789',
      message: 'test message',
    });
    
    expect(result).toBeNull();
  });

  test('returns null when PAPERCLIP_API_KEY is missing', async () => {
    process.env.PAPERCLIP_COMPANY_ID = 'comp-123';
    process.env.PAPERCLIP_PROJECT_ID = 'proj-456';
    
    const result = await createTask({
      channel: 'LINE',
      sender: 'U123',
      message: 'test message',
    });
    
    expect(result).toBeNull();
  });
});
