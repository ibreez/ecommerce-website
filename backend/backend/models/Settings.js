const { pool: db } = require('../config/database');

class Settings {
  static async getSettings() {
    try {
      // Try to create the table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          telegram_bot_token VARCHAR(500),
          telegram_chat_id VARCHAR(100),
          site_name VARCHAR(255) DEFAULT 'Electronics Store',
          site_email VARCHAR(255),
          site_phone VARCHAR(20),
          smtp_host VARCHAR(255),
          smtp_port INT DEFAULT 587,
          smtp_username VARCHAR(255),
          smtp_password VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      const [rows] = await db.execute('SELECT * FROM settings ORDER BY id DESC LIMIT 1');

      if (rows.length === 0) {
        // Return default settings if none exist
        return {
          site_name: 'Electronics Store',
          site_email: '',
          site_phone: '',
          smtp_host: '',
          smtp_port: '587',
          smtp_username: '',
          smtp_password: '',
          telegram_bot_token: '',
          telegram_chat_id: ''
        };
      }

      return rows[0];
    } catch (error) {
      console.error('Get settings error:', error);
      throw error;
    }
  }

  static async updateSettings(updates) {
    try {
      // Check if settings exist
      const [existing] = await db.execute('SELECT id FROM settings LIMIT 1');
      
      if (existing.length === 0) {
        // Create new settings record
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const placeholders = fields.map(() => '?').join(', ');
        const fieldNames = fields.join(', ');
        
        await db.execute(
          `INSERT INTO settings (${fieldNames}) VALUES (${placeholders})`,
          values
        );
      } else {
        // Update existing settings
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        await db.execute(
          `UPDATE settings SET ${setClause} WHERE id = ?`,
          [...values, existing[0].id]
        );
      }
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  }

  static async getSetting(key) {
    try {
      const [rows] = await db.execute('SELECT ?? FROM settings ORDER BY id DESC LIMIT 1', [key]);
      return rows.length > 0 ? rows[0][key] : null;
    } catch (error) {
      console.error('Get setting error:', error);
      throw error;
    }
  }

  static async getTelegramSettings() {
    try {
      const settings = await this.getSettings();
      return {
        telegram_bot_token: settings.telegram_bot_token ? settings.telegram_bot_token.slice(0, 10) + '***' : '',
        telegram_chat_id: settings.telegram_chat_id || ''
      };
    } catch (error) {
      console.error('Get Telegram settings error:', error);
      throw error;
    }
  }
}

// Export both the class and a convenience function
const getSettings = () => Settings.getSettings();

module.exports = Settings;
module.exports.getSettings = getSettings;