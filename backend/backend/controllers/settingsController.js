const { validationResult } = require('express-validator');
const Settings = require('../models/Settings');
const fs = require('fs');
const path = require('path');

const settingsController = {
  // Get all settings (admin only)
  async get(req, res) {
    try {
      const settings = await Settings.get();
      
      if (!settings) {
        return res.status(404).json({ error: 'Settings not found' });
      }

      // Remove sensitive information from response
      const safeSettings = { ...settings };
      delete safeSettings.smtp_password;
      
      res.json({ settings: safeSettings });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update settings (admin only)
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        telegram_bot_token,
        telegram_chat_id,
        site_name,
        site_email,
        site_phone,
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_password
      } = req.body;

      const settingsData = {};
      
      // Only include provided fields
      if (telegram_bot_token !== undefined) settingsData.telegram_bot_token = telegram_bot_token;
      if (telegram_chat_id !== undefined) settingsData.telegram_chat_id = telegram_chat_id;
      if (site_name !== undefined) settingsData.site_name = site_name;
      if (site_email !== undefined) settingsData.site_email = site_email;
      if (site_phone !== undefined) settingsData.site_phone = site_phone;
      if (smtp_host !== undefined) settingsData.smtp_host = smtp_host;
      if (smtp_port !== undefined) settingsData.smtp_port = smtp_port;
      if (smtp_username !== undefined) settingsData.smtp_username = smtp_username;
      if (smtp_password !== undefined) settingsData.smtp_password = smtp_password;

      await Settings.update(settingsData);

      const updatedSettings = await Settings.get();

      // Update the public settings.json file if site settings were changed
      if (site_name !== undefined || site_email !== undefined || site_phone !== undefined) {
        const publicSettings = {
          site_name: updatedSettings.site_name,
          site_email: updatedSettings.site_email,
          site_phone: updatedSettings.site_phone
        };

        const settingsJsonPath = path.join(__dirname, '../../../public/settings.json');
        try {
          fs.writeFileSync(settingsJsonPath, JSON.stringify(publicSettings, null, 2));
        } catch (error) {
          console.error('Failed to update settings.json:', error);
          // Don't fail the request if JSON update fails
        }
      }

      // Remove sensitive information from response
      const safeSettings = { ...updatedSettings };
      delete safeSettings.smtp_password;

      res.json({
        message: 'Settings updated successfully',
        settings: safeSettings
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get Telegram settings specifically (admin only)
  async getTelegramSettings(req, res) {
    try {
      const telegramSettings = await Settings.getTelegramSettings();
      
      res.json({ telegram: telegramSettings });
    } catch (error) {
      console.error('Get Telegram settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update Telegram settings specifically (admin only)
  async updateTelegramSettings(req, res) {
    try {
      const { telegram_bot_token, telegram_chat_id } = req.body;

      const updates = {};
      if (telegram_bot_token !== undefined) updates.telegram_bot_token = telegram_bot_token;
      if (telegram_chat_id !== undefined) updates.telegram_chat_id = telegram_chat_id;

      await Settings.updateSettings(updates);  // ✅ use updateSettings, not update()

      res.json({
        success: true,
        message: 'Telegram settings updated successfully'
      });
    } catch (error) {
      console.error('Update Telegram settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update Telegram settings'
      });
    }
  }
};

module.exports = settingsController;