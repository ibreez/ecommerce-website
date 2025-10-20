const { validationResult } = require('express-validator');
const Category = require('../models/Category');

const categoryController = {
  // Create new category (admin only)
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, slug, description, is_active } = req.body;
      let image_path = null;

      // Handle image upload
      if (req.file) {
        image_path = `/uploads/categories/${req.file.filename}`;
      }

      // Check if slug already exists
      const existingCategory = await Category.findBySlug(slug);
      if (existingCategory) {
        return res.status(400).json({ error: 'Category with this slug already exists' });
      }

      const categoryId = await Category.create({
        name,
        slug,
        description,
        image_path,
        is_active
      });

      const category = await Category.findById(categoryId);
      res.status(201).json({
        message: 'Category created successfully',
        category
      });
    } catch (error) {
      console.error('Category create error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get all categories
  async list(req, res) {
    try {
      const activeOnly = req.query.active === 'true';
      const categories = await Category.findAll(activeOnly);
      
      res.json({ categories });
    } catch (error) {
      console.error('Category list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get single category
  async getById(req, res) {
    try {
      const { id } = req.params;
      const category = await Category.findById(id);
      
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json({ category });
    } catch (error) {
      console.error('Category get error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update category (admin only)
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, slug, description, is_active } = req.body;

      // Check if category exists
      const existingCategory = await Category.findById(id);
      if (!existingCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if slug is taken by another category
      if (slug && slug !== existingCategory.slug) {
        const slugTaken = await Category.findBySlug(slug);
        if (slugTaken) {
          return res.status(400).json({ error: 'Category with this slug already exists' });
        }
      }

      const updateData = { name, slug, description, is_active };

      // Handle image upload
      if (req.file) {
        updateData.image_path = `/uploads/categories/${req.file.filename}`;
      }

      const updated = await Category.update(id, updateData);
      if (!updated) {
        return res.status(400).json({ error: 'Failed to update category' });
      }

      const category = await Category.findById(id);
      res.json({
        message: 'Category updated successfully',
        category
      });
    } catch (error) {
      console.error('Category update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete category (admin only)
  async delete(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const deleted = await Category.delete(id);
      if (!deleted) {
        return res.status(400).json({ error: 'Failed to delete category' });
      }

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Category delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Export individual functions for route imports
module.exports = {
  getCategories: categoryController.list,
  getCategoryById: categoryController.getById,
  createCategory: categoryController.create,
  updateCategory: categoryController.update,
  deleteCategory: categoryController.delete
};