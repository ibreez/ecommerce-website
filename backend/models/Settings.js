const { pool } = require('../config/database');

class Settings {
  // Map of setting keys to database column names
  static columnMap = {
    'telegram': 'telegram_bot_token',
    'telegram_bot_token': 'telegram_bot_token',
    'telegram_chat_id': 'telegram_chat_id',
    'site_name': 'site_name',
    'site_email': 'site_email',
    'site_phone': 'site_phone',
    'site_address': 'site_address',
    'site_logo': 'site_logo',
    'site_favicon': 'site_favicon',
    'site_description': 'site_description',
    'site_fevi_tag': 'site_fevi_tag',
    'smtp_host': 'smtp_host',
    'smtp_port': 'smtp_port',
    'smtp_username': 'smtp_username',
    'smtp_password': 'smtp_password'
  };

  static async findAll() {
    try {
      // Ensure settings row exists
      await this.ensureSettingsRow();

      const query = `SELECT * FROM settings LIMIT 1`;
      const [rows] = await pool.execute(query);

      if (rows.length === 0) {
        return [];
      }

      // Convert single row to array of key-value objects
      const settings = [];
      const row = rows[0];

      for (const [key, column] of Object.entries(this.columnMap)) {
        settings.push({
          id: row.id,
          setting_key: key,
          setting_value: row[column] || '',
          description: `${key} setting`,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      }

      return settings;
    } catch (error) {
      console.error('Settings findAll error:', error);
      throw error;
    }
  }

  static async findByKey(key) {
    try {
      // Ensure settings row exists
      await this.ensureSettingsRow();

      const column = this.columnMap[key];
      if (!column) {
        return null;
      }

      const query = `SELECT ${column} as setting_value, id, created_at, updated_at FROM settings LIMIT 1`;
      const [rows] = await pool.execute(query);

      if (rows.length === 0) {
        return null;
      }

      return {
        id: rows[0].id,
        setting_key: key,
        setting_value: rows[0].setting_value || '',
        description: `${key} setting`,
        created_at: rows[0].created_at,
        updated_at: rows[0].updated_at
      };
    } catch (error) {
      console.error('Settings findByKey error:', error);
      throw error;
    }
  }

  static async getValue(key, defaultValue = null) {
    try {
      const setting = await this.findByKey(key);
      return setting ? setting.setting_value : defaultValue;
    } catch (error) {
      console.error('Settings getValue error:', error);
      return defaultValue;
    }
  }

  static async getSettings() {
    try {
      const settingsArray = await Settings.findAll();
      const settings = {};

      settingsArray.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value || '';
      });

      return settings;
    } catch (error) {
      console.error('Settings getSettings error:', error);
      throw error;
    }
  }

  static async update(key, value) {
    try {
      // Ensure settings row exists
      await this.ensureSettingsRow();

      const column = this.columnMap[key];
      if (!column) {
        throw new Error(`Unknown setting key: ${key}`);
      }

      // Get the id of the settings row
      const [rows] = await pool.execute('SELECT id FROM settings LIMIT 1');
      if (rows.length === 0) {
        throw new Error('Settings row not found');
      }
      const id = rows[0].id;

      const query = `UPDATE settings SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const [result] = await pool.execute(query, [value, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Settings update error:', error);
      throw error;
    }
  }

  static async upsert(key, value, description = null) {
    try {
      return await this.update(key, value);
    } catch (error) {
      console.error('Settings upsert error:', error);
      // If column doesn't exist, try to add it dynamically
      if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('Unknown column')) {
        try {
          await pool.execute(`ALTER TABLE settings ADD COLUMN ${this.columnMap[key]} VARCHAR(255) DEFAULT '${value}'`);
          console.log(`Added column ${this.columnMap[key]} to settings table`);
          // Now try the update again
          return await this.update(key, value);
        } catch (alterError) {
          console.error('Failed to add column:', alterError);
          throw error; // Throw original error
        }
      }
      throw error;
    }
  }

  static async updateSettings(updates) {
    try {
      await this.ensureSettingsRow();

      const fields = Object.keys(updates);
      const values = Object.values(updates);

      // Map keys to column names using columnMap
      const columns = fields.map(field => {
        const column = this.columnMap[field];
        if (!column) {
          throw new Error(`Unknown setting key: ${field}`);
        }
        return column;
      });

      const setClause = columns.map(column => `${column} = ?`).join(', ');

      // Get the id of the settings row
      const [rows] = await pool.execute('SELECT id FROM settings LIMIT 1');
      if (rows.length === 0) {
        throw new Error('Settings row not found');
      }
      const id = rows[0].id;

      const query = `UPDATE settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const [result] = await pool.execute(query, [...values, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Settings updateSettings error:', error);
      throw error;
    }
  }

  static async ensureSettingsRow() {
    try {
      // Check if settings row exists
      const [rows] = await pool.execute('SELECT COUNT(*) as count FROM settings');
      if (rows[0].count === 0) {
        // Create default settings row with all columns
        await pool.execute(`
          INSERT INTO settings (
            telegram_bot_token, telegram_chat_id, site_name, site_email,
            site_phone, site_address, site_logo, site_favicon, site_description,
            site_fevi_tag, smtp_host, smtp_port, smtp_username, smtp_password
          ) VALUES (
            '', '', 'NJ HARDWARE', 'info@njhardware.com.mv',
            '+960 3355960', 'Lot 10485, Nirolhu Magu, Hulhumale',
            '/images/logo-1759489025807-84075602.png',
            '/images/favicon-1759485787687-488906004.png',
            'Our spacious and well-organized store is stocked with an extensive selection of high-quality tools, building materials, plumbing supplies, electrical components, paint, and much more.',
            'NJ', '', 587, '', ''
          )
        `);
      }
    } catch (error) {
      console.error('Settings ensureSettingsRow error:', error);
      throw error;
    }
  }

  // Legacy methods for compatibility (not used in new structure)
  static async create(settingData) {
    throw new Error('Create method not supported for single-row settings table');
  }

  static async delete(key) {
    throw new Error('Delete method not supported for single-row settings table');
  }
}

module.exports = Settings;
