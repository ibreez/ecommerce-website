const axios = require('axios');
const telegramService = require('../utils/telegram');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock settings
jest.mock('../models/Settings', () => ({
  getSettings: jest.fn()
}));

const { getSettings } = require('../models/Settings');

describe('TelegramService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    telegramService.botToken = null;
    telegramService.chatId = null;
  });

  describe('maskToken', () => {
    it('should mask token correctly', () => {
      expect(telegramService.maskToken('1234567890abcdef')).toBe('1234567890***cdef');
      expect(telegramService.maskToken('short')).toBe('short***');
      expect(telegramService.maskToken('')).toBe('***');
      expect(telegramService.maskToken(null)).toBe('***');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(telegramService.escapeHtml('<>&"\'')).toBe('<>&amp;"&#39;');
      expect(telegramService.escapeHtml('Normal text')).toBe('Normal text');
    });
  });

  describe('sendOrderNotification', () => {
    const mockOrder = {
      id: 123,
      user_name: 'John Doe',
      phone: '123-4567',
      shipping_address: '123 Main St, City',
      total_amount: 22.5,
      items: [
        { product_name: 'Terminal Block 12-Way', quantity: 1, price: 8.75 },
        { product_name: '5A Fast Blow Fuse', quantity: 1, price: 1.25 }
      ]
    };

    beforeEach(() => {
      getSettings.mockResolvedValue({
        telegram_bot_token: 'test_token_12345',
        telegram_chat_id: '123456789',
        site_name: 'Test Store'
      });
    });

    it('should send notification successfully', async () => {
      mockedAxios.post.mockResolvedValue({ data: { ok: true } });

      const result = await telegramService.sendOrderNotification(mockOrder);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest_token_12345/sendMessage',
        expect.objectContaining({
          chat_id: '123456789',
          text: expect.stringContaining('<b>New Order #123</b>'),
          parse_mode: 'HTML'
        })
      );
    });

    it('should handle telegram not configured', async () => {
      getSettings.mockResolvedValue({
        telegram_bot_token: '',
        telegram_chat_id: ''
      });

      const result = await telegramService.sendOrderNotification(mockOrder);

      expect(result).toBe(true); // Should not fail
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { ok: true } });

      const result = await telegramService.sendOrderNotification(mockOrder);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Persistent error'));

      const result = await telegramService.sendOrderNotification(mockOrder);

      expect(result).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      getSettings.mockResolvedValue({
        telegram_bot_token: 'test_token_12345',
        telegram_chat_id: '123456789'
      });
    });

    it('should test connection successfully', async () => {
      mockedAxios.post.mockResolvedValue({ data: { ok: true } });

      const result = await telegramService.testConnection();

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest_token_12345/sendMessage',
        expect.objectContaining({
          text: expect.stringContaining('<b>Test Message</b>'),
          parse_mode: 'HTML'
        })
      );
    });

    it('should fail if telegram not configured', async () => {
      getSettings.mockResolvedValue({
        telegram_bot_token: '',
        telegram_chat_id: ''
      });

      const result = await telegramService.testConnection();

      expect(result).toBe(false);
    });
  });
});
