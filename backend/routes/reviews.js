const express = require('express');
const { body } = require('express-validator');
const reviewController = require('../controllers/reviewController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

// Validation rules
const reviewValidation = [
  body('product_id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
];

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes
router.post('/', authenticateToken, reviewValidation, reviewController.create);
router.put('/:id', authenticateToken, reviewValidation, reviewController.update);
router.delete('/:id', authenticateToken, reviewController.delete);

module.exports = router;