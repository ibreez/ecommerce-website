const axios = require('axios');
const { getSettings } = require('../models/Settings');

class TelegramService {
  constructor() {
    this.botToken = null;
    this.chatId = null;
  }

  // Mask token for logging
  maskToken(token) {
    if (!token) return '***';
    return token.slice(0, 10) + '***' + token.slice(-4);
  }

  async initializeBot() {
    try {
      const settings = await getSettings();

      if (!settings.telegram_bot_token || !settings.telegram_chat_id) {
        console.log('Telegram bot settings not configured');
        return false;
      }

      this.botToken = settings.telegram_bot_token;
      this.chatId = settings.telegram_chat_id;

      // Test bot connection
      const response = await axios.get(`https://api.telegram.org/bot${this.botToken}/getMe`);
      if (response.data.ok) {
        console.log('Telegram bot connection verified successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error.message);
      return false;
    }
  }

  // Retry with exponential backoff
  async sendWithRetry(url, data, maxRetries = 2) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await axios.post(url, data, { timeout: 10000 });
        return response;
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) throw error;

        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
        console.warn(`Telegram send attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Escape HTML entities
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#39;');
  }

  async sendOrderNotification(order) {
    try {
      if (!this.botToken || !this.chatId) {
        const initialized = await this.initializeBot();
        if (!initialized) {
          console.info('Telegram not configured, skipping notification');
          return true; // Don't fail the order
        }
      }

      const settings = await getSettings();
      const siteName = settings.site_name || 'Electronics Store';

      const orderItemsText = order.items.map(item =>
        `${item.quantity}× ${this.escapeHtml(item.product_name)} — $${(item.price * item.quantity).toFixed(2)}`
      ).join('\n');

      const message = `<b>New Order #${order.id}</b>
<i>Status:</i> ${this.escapeHtml(order.status.charAt(0).toUpperCase() + order.status.slice(1))}
<b>Customer:</b> ${this.escapeHtml(order.user_name)}
<b>Phone:</b> ${this.escapeHtml(order.phone)}
<b>Address:</b> ${this.escapeHtml(order.shipping_address)}
<b>Total:</b> $${order.total_amount.toFixed(2)}

<b>Items:</b>
${orderItemsText}`;

      const response = await this.sendWithRetry(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });

      if (response.data.ok) {
        console.log(`Telegram notification sent for order #${order.id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to send Telegram notification for order #${order.id}:`, error.message);
      return false;
    }
  }

  async sendStatusUpdate(order, oldStatus, newStatus) {
    try {
      if (!this.botToken || !this.chatId) {
        const initialized = await this.initializeBot();
        if (!initialized) return false;
      }

      const settings = await getSettings();
      const siteName = settings.site_name || 'Electronics Store';

      const message = `<b>Order Status Updated</b> - ${this.escapeHtml(siteName)}

<b>Order #${order.id}</b>
<i>Customer:</i> ${this.escapeHtml(order.user_name)}
<i>Status:</i> ${oldStatus} → ${newStatus}
<i>Total:</i> $${order.total_amount.toFixed(2)}
<i>Updated:</i> ${new Date().toLocaleString()}`;

      const response = await this.sendWithRetry(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });

      if (response.data.ok) {
        console.log('Telegram status update sent successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to send Telegram status update:', error.message);
      return false;
    }
  }

  async testConnection() {
    try {
      const initialized = await this.initializeBot();
      if (!initialized) return false;

      const testMessage = `<b>Test Message</b>\n\nTelegram bot is working correctly!\nTimestamp: ${new Date().toLocaleString()}`;

      const response = await this.sendWithRetry(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.chatId,
        text: testMessage,
        parse_mode: 'HTML'
      });

      return response.data.ok;
    } catch (error) {
      console.error('Telegram test failed:', error.message);
      return false;
    }
  }
}

module.exports = new TelegramService();
