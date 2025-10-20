const express = require('express');
const { body } = require('express-validator');
const reviewController = require('../controllers/reviewController');
const { authenticateToken, requireRole } = require('../utils/auth');

const router = express.Router();

// Validation rules
const reviewValidation = [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters')
];

const approvalValidation = [
  body('is_approved').isBoolean().withMessage('is_approved must be a boolean value')
];

// Public routes
router.get('/product/:product_id', reviewController.getByProductId);

// User routes
router.post('/', authenticateToken, reviewValidation, reviewController.create);

// Admin routes
router.get('/admin/list', authenticateToken, requireRole(['admin', 'superadmin']), reviewController.adminList);
router.put('/:id/approval', authenticateToken, requireRole(['admin', 'superadmin']), approvalValidation, reviewController.updateApproval);
router.delete('/:id', authenticateToken, requireRole(['admin', 'superadmin']), reviewController.delete);

module.exports = router;