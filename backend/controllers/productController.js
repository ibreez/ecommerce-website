const { validationResult } = require('express-validator');
const Product = require('../models/Product');

// Helper function to parse boolean values from various inputs
const parseBoolean = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof val === 'number') return val === 1;
  return false; // default to false for unknown types
};

const productController = {
  // Get all products with filtering
  async getProducts(req, res) {
    try {
      const {
        category_id,
        search,
        featured,
        limit = 20,
        offset = 0,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const filters = {
        category_id: category_id ? parseInt(category_id) : null,
        search: search || null,
        featured: featured === 'true' ? true : null,
        is_active: req.user ? null : true
      };

      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        sort_by,
        sort_order: sort_order.toUpperCase()
      };

      const products = await Product.findAll(filters, options);
      const total = await Product.count(filters);

      res.json({
        success: true,
        products,
        pagination: {
          total,
          limit: options.limit,
          offset: options.offset,
          has_more: (options.offset + options.limit) < total
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  // Get featured products
  async getFeaturedProducts(req, res) {
    try {
      const { limit = 8 } = req.query;

      const products = await Product.findAll(
        { featured: true, is_active: true },
        { limit: parseInt(limit), sort_by: 'created_at', sort_order: 'DESC' }
      );

      res.json({
        success: true,
        products
      });
    } catch (error) {
      console.error('Get featured products error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  // Get single product by ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid product ID'
        });
      }

      const product = await Product.findById(parseInt(id));

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      res.json({
        success: true,
        product
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  // Create new product (admin only)
  async createProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        name,
        description,
        category_id,
        price,
        stock,
        sku,
        featured = false,
        is_active = true
      } = req.body;

      let image_path = null;
      if (req.file) {
        image_path = `/uploads/products/${req.file.filename}`;
      }

      // Check if SKU already exists
      if (sku) {
        const existingProduct = await Product.findBySku(sku);
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            error: 'Product with this SKU already exists'
          });
        }
      }

      const productData = {
        name,
        description,
        category_id: parseInt(category_id),
        price: parseFloat(price),
        stock: stock ? parseInt(stock) : 0,
        sku,
        image_path,
        featured: parseBoolean(featured ?? false),
        is_active: parseBoolean(is_active ?? true)
      };

      const productId = await Product.create(productData);
      const product = await Product.findById(productId);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  },

  // Update product (admin only)
  async updateProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const {
        name,
        description,
        category_id,
        price,
        stock,
        sku,
        featured,
        is_active
      } = req.body;

      // Check if product exists
      const existingProduct = await Product.findById(parseInt(id));
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Check if SKU is taken by another product
      if (sku && sku !== existingProduct.sku) {
        const skuTaken = await Product.findBySku(sku);
        if (skuTaken) {
          return res.status(400).json({
            success: false,
            error: 'Product with this SKU already exists'
          });
        }
      }

      const updateData = {
        name,
        description,
        category_id: category_id ? parseInt(category_id) : existingProduct.category_id,
        price: price ? parseFloat(price) : existingProduct.price,
        stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
        sku,
        featured: featured !== undefined ? parseBoolean(featured) : existingProduct.featured,
        is_active: is_active !== undefined ? parseBoolean(is_active) : existingProduct.is_active
      };

      // Handle image upload
      if (req.file) {
        updateData.image_path = `/uploads/products/${req.file.filename}`;
      }

      const updated = await Product.update(parseInt(id), updateData);
      if (!updated) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update product'
        });
      }

      const product = await Product.findById(parseInt(id));
      res.json({
        success: true,
        message: 'Product updated successfully',
        product
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  // Delete product (admin only)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const product = await Product.findById(parseInt(id));
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      const deleted = await Product.delete(parseInt(id));
      if (!deleted) {
        return res.status(400).json({
          success: false,
          error: 'Failed to delete product'
        });
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  },

  // Get product count for dashboard
  async getProductCount(req, res) {
    try {
      const current = await Product.countCurrentMonth();
      const previous = await Product.countPreviousMonth();

      res.json({
        success: true,
        current,
        previous
      });
    } catch (error) {
      console.error('Get product count error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
};

// Export individual functions for route imports
module.exports = {
  getProducts: productController.getProducts,
  getFeaturedProducts: productController.getFeaturedProducts,
  getProductById: productController.getProductById,
  createProduct: productController.createProduct,
  updateProduct: productController.updateProduct,
  deleteProduct: productController.deleteProduct,
  getProductCount: productController.getProductCount
};
