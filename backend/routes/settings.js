const express = require('express');
const { body } = require('express-validator');
const settingsController = require('../controllers/settingsController');
const { authenticateToken, requireAdmin } = require('../utils/auth');
const { uploadSettings } = require('../config/multer');

const router = express.Router();

// Validation rules
const settingValidation = [
  body('setting_key').trim().isLength({ min: 1, max: 100 }).withMessage('Setting key is required and must be less than 100 characters'),
  body('setting_value').trim().isLength({ min: 0, max: 1000 }).withMessage('Setting value must be less than 1000 characters')
];

// Public routes (for getting public settings)
router.get('/public', settingsController.getPublicSettings);

// Admin routes
router.get('/', authenticateToken, requireAdmin, settingsController.getAllSettings);
router.get('/:key', authenticateToken, requireAdmin, settingsController.getSettingByKey);
router.post('/', authenticateToken, requireAdmin, settingValidation, settingsController.createSetting);
router.put('/', authenticateToken, requireAdmin, uploadSettings.fields([{ name: 'site_logo', maxCount: 1 }, { name: 'site_favicon', maxCount: 1 }]), settingsController.updateMultipleSettings);
router.put('/:key', authenticateToken, requireAdmin, settingValidation, settingsController.updateSetting);
router.put('/telegram', authenticateToken, requireAdmin, settingsController.updateTelegramSettings);
router.post('/telegram/test', authenticateToken, requireAdmin, settingsController.testTelegramConnection);
router.delete('/:key', authenticateToken, requireAdmin, settingsController.deleteSetting);

module.exports = router;