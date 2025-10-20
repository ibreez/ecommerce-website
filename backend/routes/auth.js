const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../utils/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const adminCreateValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['admin', 'superadmin']).withMessage('Role must be admin or superadmin')
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.profile);

// Admin routes
router.post('/admin/create', authenticateToken, requireRole(['admin', 'superadmin']), adminCreateValidation, authController.adminCreate);
router.get('/admin/list', authenticateToken, requireRole(['superadmin']), authController.adminList);
router.delete('/admin/:id', authenticateToken, requireRole(['superadmin']), authController.adminDelete);

// Get user count for dashboard
router.get('/users/count', authenticateToken, requireRole(['admin', 'superadmin']), authController.getUserCount);

module.exports = router;
