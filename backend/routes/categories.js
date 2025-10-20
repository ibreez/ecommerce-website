const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../utils/auth');
const { uploadCategoryImage } = require('../utils/fileUpload');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin routes
router.post('/', authenticateToken, requireAdmin, uploadCategoryImage, createCategory);
router.put('/:id', authenticateToken, requireAdmin, uploadCategoryImage, updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, deleteCategory);

module.exports = router;