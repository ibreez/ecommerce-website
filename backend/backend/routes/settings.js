const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../utils/auth');
const Settings = require('../models/Settings');
const settingsController = require('../controllers/settingsController');
const telegramService = require('../utils/telegram');
const emailService = require('../utils/email');

// Get settings
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    // Don't send sensitive data like passwords
    const safeSettings = { ...settings };
    if (safeSettings.smtp_password) {
      safeSettings.smtp_password = '***';
    }
    if (safeSettings.telegram_bot_token) {
      safeSettings.telegram_bot_token = safeSettings.telegram_bot_token.slice(0, 10) + '***';
    }

    res.json({
      success: true,
      settings: safeSettings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Update general settings
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { site_name, site_email, site_phone, smtp_host, smtp_port, smtp_username, smtp_password } = req.body;

    const updates = {};
    if (site_name !== undefined) updates.site_name = site_name;
    if (site_email !== undefined) updates.site_email = site_email;
    if (site_phone !== undefined) updates.site_phone = site_phone;
    if (smtp_host !== undefined) updates.smtp_host = smtp_host;
    if (smtp_port !== undefined) updates.smtp_port = smtp_port;
    if (smtp_username !== undefined) updates.smtp_username = smtp_username;
    if (smtp_password !== undefined && smtp_password !== '***') {
      updates.smtp_password = smtp_password;
    }

    await Settings.updateSettings(updates);

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Get Telegram settings
router.get('/telegram', authenticateToken, requireAdmin, settingsController.getTelegramSettings);

// Update Telegram settings
router.put('/telegram', authenticateToken, requireAdmin, settingsController.updateTelegramSettings);

// Update individual setting
router.put('/:key', authenticateToken, requireAdmin, settingsController.updateSetting);

  // Test Telegram connection
  router.post('/telegram/test', authenticateToken, requireAdmin, async (req, res) => {
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
          message: 'Telegram connection test failed'
        });
      }
    } catch (error) {
      console.error('Telegram test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test Telegram connection'
      });
    }
  });

  // Test Email SMTP connection
  router.post('/email/test', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const success = await emailService.initializeTransporter();
      if (success) {
        res.json({
          success: true,
          message: 'Email SMTP connection test successful'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Email SMTP connection test failed'
        });
      }
    } catch (error) {
      console.error('Email SMTP test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test Email SMTP connection'
      });
    }
  });

module.exports = router;