const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateSettingsTable() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_electronics',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('Starting settings table migration...');

    // Check current table structure
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM settings
    `);

    const columnNames = columns.map(col => col.Field);
    console.log('Current columns:', columnNames);

    // Add missing columns if they don't exist
    const columnsToAdd = [
      { name: 'site_address', type: 'TEXT DEFAULT ""', after: 'site_phone' },
      { name: 'site_logo', type: 'VARCHAR(500) DEFAULT ""', after: 'site_address' },
      { name: 'site_favicon', type: 'VARCHAR(500) DEFAULT ""', after: 'site_logo' },
      { name: 'site_description', type: 'TEXT DEFAULT ""', after: 'site_favicon' }
    ];

    for (const col of columnsToAdd) {
      if (!columnNames.includes(col.name)) {
        console.log(`Adding column ${col.name}...`);
        await connection.execute(`
          ALTER TABLE settings ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}
        `);
        console.log(`✅ Added column ${col.name}`);
      } else {
        console.log(`Column ${col.name} already exists`);
      }
    }

    // Check if we need to migrate from key-value to single-row structure
    if (columnNames.includes('setting_key')) {
      console.log('Migrating from key-value structure to single-row structure...');

      // Get all existing settings
      const [settings] = await connection.execute('SELECT * FROM settings');
      console.log('Found', settings.length, 'setting rows');

      if (settings.length > 0) {
        // Create a map of setting_key -> setting_value
        const settingsMap = {};
        settings.forEach(setting => {
          settingsMap[setting.setting_key] = setting.setting_value || '';
        });

        // Drop the old table and recreate with new structure
        await connection.execute('DROP TABLE settings');

        // Create new settings table structure
        await connection.execute(`
          CREATE TABLE settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            telegram_bot_token VARCHAR(255) DEFAULT '',
            telegram_chat_id VARCHAR(255) DEFAULT '',
            site_name VARCHAR(255) DEFAULT 'Electronics Store',
            site_email VARCHAR(255) DEFAULT '',
            site_phone VARCHAR(255) DEFAULT '',
            site_address TEXT DEFAULT '',
            site_logo VARCHAR(500) DEFAULT '',
            site_favicon VARCHAR(500) DEFAULT '',
            site_description TEXT DEFAULT '',
            smtp_host VARCHAR(255) DEFAULT '',
            smtp_port VARCHAR(10) DEFAULT '587',
            smtp_username VARCHAR(255) DEFAULT '',
            smtp_password VARCHAR(255) DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        // Insert default row with migrated values
        await connection.execute(`
          INSERT INTO settings (
            telegram_bot_token, telegram_chat_id, site_name, site_email, site_phone,
            site_address, site_logo, site_favicon, site_description,
            smtp_host, smtp_port, smtp_username, smtp_password
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          settingsMap.telegram_bot_token || '',
          settingsMap.telegram_chat_id || '',
          settingsMap.site_name || 'Electronics Store',
          settingsMap.site_email || '',
          settingsMap.site_phone || '',
          settingsMap.site_address || '',
          settingsMap.site_logo || '',
          settingsMap.site_favicon || '',
          settingsMap.site_description || '',
          settingsMap.smtp_host || '',
          settingsMap.smtp_port || '587',
          settingsMap.smtp_username || '',
          settingsMap.smtp_password || ''
        ]);

        console.log('✅ Migrated settings table to single-row structure');
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await connection.end();
  }
}

migrateSettingsTable().catch(console.error);
