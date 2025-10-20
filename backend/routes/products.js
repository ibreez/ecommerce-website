const express = require('express');
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../utils/auth');
const { uploadProduct } = require('../config/multer');

const router = express.Router();

// Validation rules
const productValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Product name is required and must be less than 255 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('sku').optional().trim().isLength({ max: 100 }).withMessage('SKU must be less than 100 characters')
];

// Public routes
router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);

// Get product count for dashboard
router.get(
  '/count',
  authenticateToken,
  requireRole(['admin', 'superadmin']),
  productController.getProductCount
);

router.get('/:id', productController.getProductById);

// Admin routes
router.get(
  '/admin/list',
  authenticateToken,
  requireRole(['admin', 'superadmin']),
  productController.getProducts
);

router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'superadmin']),
  uploadProduct.single('image'),
  productValidation,
  productController.createProduct
);

router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'superadmin']),
  uploadProduct.single('image'),
  productValidation,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'superadmin']),
  productController.deleteProduct
);

module.exports = router;
