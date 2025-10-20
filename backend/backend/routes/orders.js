const express = require('express');
const { body } = require('express-validator');
const orderController = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../utils/auth');

const router = express.Router();

// Validation rules
const orderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Valid product ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1 for each item'),
  body('payment_method').isIn(['cod', 'bank_transfer']).withMessage('Payment method must be cod or bank_transfer'),
  body('shipping_address').trim().isLength({ min: 10, max: 500 }).withMessage('Shipping address is required and must be between 10-500 characters'),
  body('phone').trim().isLength({ min: 10, max: 20 }).withMessage('Phone number is required and must be between 10-20 characters'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
];

const statusValidation = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid order status')
];

// User routes
router.post('/', authenticateToken, orderValidation, orderController.create);
router.get('/my-orders', authenticateToken, orderController.getUserOrders);
router.get('/:id', authenticateToken, orderController.getById);

// Admin routes
router.get('/admin/list', authenticateToken, requireRole(['admin', 'superadmin']), orderController.adminList);
router.put('/:id/status', authenticateToken, requireRole(['admin', 'superadmin']), statusValidation, orderController.updateStatus);

module.exports = router;