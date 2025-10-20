const { validationResult } = require('express-validator');
const Settings = require('../models/Settings');
const telegramService = require('../utils/telegram');
const fs = require('fs');
const path = require('path');

const settingsController = {
  // Get all settings (admin only)
  async getAllSettings(req, res) {
    try {
      const settingsArray = await Settings.findAll();

      // Convert array of settings to object format expected by frontend
      const settings = {};
      settingsArray.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value || '';
      });

      // Ensure all expected settings are present with default values
      const defaultSettings = {
        telegram_bot_token: '',
        telegram_chat_id: '',
        site_name: 'Electronics Store',
        site_email: '',
        site_phone: '',
        site_fevi_tag: 'NJ',
        smtp_host: '',
        smtp_port: '587',
        smtp_username: '',
        smtp_password: ''
      };

      // Merge with defaults
      const mergedSettings = { ...defaultSettings, ...settings };

      res.json({ settings: mergedSettings });
    } catch (error) {
      console.error('Get all settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get public settings (no auth required)
  async getPublicSettings(req, res) {
    try {
      // Define which settings are public
      const publicKeys = ['site_name', 'site_email', 'site_phone', 'site_description', 'contact_email', 'business_hours'];
      const settings = {};

      for (const key of publicKeys) {
        const value = await Settings.getValue(key);
        if (value !== null) {
          settings[key] = value;
        }
      }

      res.json({ settings });
    } catch (error) {
      console.error('Get public settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get setting by key
  async getSettingByKey(req, res) {
    try {
      const { key } = req.params;
      const setting = await Settings.findByKey(key);
      
      if (!setting) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      
      res.json({ setting });
    } catch (error) {
      console.error('Get setting error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create new setting
  async createSetting(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { setting_key, setting_value, description } = req.body;

      // Check if setting already exists
      const existingSetting = await Settings.findByKey(setting_key);
      if (existingSetting) {
        return res.status(400).json({ error: 'Setting with this key already exists' });
      }

      const settingId = await Settings.create({
        setting_key,
        setting_value,
        description
      });

      const setting = await Settings.findByKey(setting_key);
      res.status(201).json({
        message: 'Setting created successfully',
        setting
      });
    } catch (error) {
      console.error('Setting create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update setting
  async updateSetting(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { key } = req.params;
      const { setting_value, telegram_chat_id } = req.body;

      const updates = {};
      if (key === 'telegram') {
        updates.telegram_bot_token = setting_value;
      }
      if (telegram_chat_id !== undefined) {
        updates.telegram_chat_id = telegram_chat_id;
      }

      await Settings.updateSettings(updates);

      res.json({
        success: true,
        message: 'Telegram settings updated successfully'
      });
    } catch (error) {
      console.error('Setting update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update Telegram settings'
      });
    }
  },

  // Update multiple settings
  async updateMultipleSettings(req, res) {
    try {
      const updates = req.body;

      // Handle file uploads for logo and favicon
      if (req.files) {
        if (req.files.site_logo && req.files.site_logo[0]) {
          // Delete old logo file if exists
          const currentLogo = await Settings.getValue('site_logo');
          if (currentLogo && currentLogo.startsWith('/images/')) {
            const oldLogoFilename = path.basename(currentLogo);
            const oldLogoPath = path.join(__dirname, '../../public/images/', oldLogoFilename);
            if (fs.existsSync(oldLogoPath)) {
              fs.unlinkSync(oldLogoPath);
            }
          }
          updates.site_logo = `/images/${req.files.site_logo[0].filename}`;
        }
        if (req.files.site_favicon && req.files.site_favicon[0]) {
          // Delete old favicon file if exists
          const currentFavicon = await Settings.getValue('site_favicon');
          if (currentFavicon && currentFavicon.startsWith('/images/')) {
            const oldFaviconFilename = path.basename(currentFavicon);
            const oldFaviconPath = path.join(__dirname, '../../public/images/', oldFaviconFilename);
            if (fs.existsSync(oldFaviconPath)) {
              fs.unlinkSync(oldFaviconPath);
            }
          }
          updates.site_favicon = `/images/${req.files.site_favicon[0].filename}`;
        }
      }

      // Update each setting in the request body
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          await Settings.upsert(key, String(value), `${key} setting`);
        }
      }

      // After updating settings, update the public settings.json file with all relevant keys
      const siteName = updates.site_name || (await Settings.getValue('site_name'));
      const siteEmail = updates.site_email || (await Settings.getValue('site_email'));
      const sitePhone = updates.site_phone || (await Settings.getValue('site_phone'));
      const siteAddress = updates.site_address || (await Settings.getValue('site_address'));
      const siteLogo = updates.site_logo || (await Settings.getValue('site_logo'));
      const siteFavicon = updates.site_favicon || (await Settings.getValue('site_favicon'));
      const siteDescription = updates.site_description || (await Settings.getValue('site_description'));
      const siteFeviTag = updates.site_fevi_tag || (await Settings.getValue('site_fevi_tag'));

      const publicSettings = {
        site_name: siteName,
        site_email: siteEmail,
        site_phone: sitePhone,
        site_address: siteAddress,
        site_logo: siteLogo,
        site_favicon: siteFavicon,
        site_description: siteDescription,
        site_fevi_tag: siteFeviTag
      };

      const settingsJsonPath = path.join(__dirname, '../../public/settings.json');
      try {
        fs.writeFileSync(settingsJsonPath, JSON.stringify(publicSettings, null, 2));
      } catch (error) {
        console.error('Failed to update settings.json:', error);
        // Don't fail the request if JSON update fails
      }

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Update multiple settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
  },

  // Update Telegram settings specifically (admin only)
  async updateTelegramSettings(req, res) {
    try {
      const { telegram_bot_token, telegram_chat_id } = req.body;

      const updates = {};
      if (telegram_bot_token !== undefined) updates.telegram_bot_token = telegram_bot_token;
      if (telegram_chat_id !== undefined) updates.telegram_chat_id = telegram_chat_id;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid Telegram settings provided'
        });
      }

      await Settings.updateSettings(updates);

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
  },

  // Test Telegram connection
  async testTelegramConnection(req, res) {
    try {
      const success = await telegramService.testConnection();

      if (success) {
        res.json({
          success: true,
          message: 'Telegram connection test successful'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Telegram connection test failed. Please check your bot token and chat ID.'
        });
      }
    } catch (error) {
      console.error('Test Telegram connection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test Telegram connection'
      });
    }
  },

  // Delete setting
  async deleteSetting(req, res) {
    try {
      const { key } = req.params;

      const deleted = await Settings.delete(key);
      if (!deleted) {
        return res.status(404).json({ error: 'Setting not found' });
      }

      res.json({ message: 'Setting deleted successfully' });
    } catch (error) {
      console.error('Setting delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = settingsController;