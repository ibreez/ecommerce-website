const express = require('express');
const { body } = require('express-validator');
const receiptController = require('../controllers/receiptController');
const { authenticateToken, requireRole } = require('../utils/auth');
const { uploadReceipt } = require('../config/multer');

const router = express.Router();

// Validation rules
const receiptValidation = [
  body('order_id').isInt({ min: 1 }).withMessage('Valid order ID is required')
];

// User routes
router.post('/upload', authenticateToken, uploadReceipt.single('receipt'), receiptValidation, receiptController.upload);
router.get('/order/:order_id', authenticateToken, receiptController.getByOrderId);

// Admin routes
router.delete('/:id', authenticateToken, requireRole(['admin', 'superadmin']), receiptController.delete);

module.exports = router;