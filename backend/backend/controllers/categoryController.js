const Category = require('../models/Category');
const { deleteFile, getFileUrl } = require('../utils/fileUpload');

const getCategories = async (req, res) => {
  try {
    const { active_only } = req.query;
    const filters = {};
    
    if (active_only === 'true') {
      filters.is_active = true;
    }

    const categories = await Category.getAll(filters);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.getById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug, description, is_active } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
    }

    // Check if slug already exists
    const existingCategory = await Category.getBySlug(slug);
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Slug already exists'
      });
    }

    const categoryData = {
      name,
      slug,
      description,
      is_active: is_active !== 'false',
      image_path: req.file ? getFileUrl(`categories/${req.file.filename}`) : null
    };

    const categoryId = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: {
        id: categoryId,
        ...categoryData
      }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, is_active } = req.body;

    // Check if category exists
    const existingCategory = await Category.getById(id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if slug is being changed and if it already exists
    if (slug && slug !== existingCategory.slug) {
      const slugExists = await Category.getBySlug(slug);
      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active !== 'false';

    // Handle image upload
    if (req.file) {
      // Delete old image if it exists
      if (existingCategory.image_path) {
        const oldImagePath = existingCategory.image_path.replace('/uploads/', 'uploads/');
        deleteFile(oldImagePath);
      }
      updateData.image_path = getFileUrl(`categories/${req.file.filename}`);
    }

    await Category.update(id, updateData);

    res.json({
      success: true,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get category to delete associated image
    const category = await Category.getById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const hasProducts = await Category.hasProducts(id);
    if (hasProducts) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing products'
      });
    }

    // Delete category image if it exists
    if (category.image_path) {
      const imagePath = category.image_path.replace('/uploads/', 'uploads/');
      deleteFile(imagePath);
    }

    // Delete category
    await Category.delete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};