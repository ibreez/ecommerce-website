const Product = require('../models/Product');
const { deleteFile, getFileUrl } = require('../utils/fileUpload');

const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category_id, search, featured } = req.query;
    const offset = (page - 1) * limit;

    const filters = {};
    if (category_id) filters.category_id = category_id;
    if (search) filters.search = search;
    if (featured) filters.featured = featured === 'true';

    const result = await Product.getAll({ 
      limit: parseInt(limit), 
      offset, 
      ...filters 
    });

    res.json({
      success: true,
      products: result.products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const result = await Product.getAll({ 
      limit: parseInt(limit), 
      offset: 0, 
      featured: true 
    });

    res.json({
      success: true,
      products: result.products
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products'
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.getById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
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
      message: 'Failed to fetch product'
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, category_id, price, stock, sku, featured, is_active } = req.body;

    if (!name || !category_id || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and price are required'
      });
    }

    const productData = {
      name,
      description,
      category_id: parseInt(category_id),
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      sku,
      featured: featured === 'true',
      is_active: is_active !== 'false',
      image_path: req.file ? getFileUrl(`products/${req.file.filename}`) : null
    };

    const productId = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        id: productId,
        ...productData
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category_id, price, stock, sku, featured, is_active } = req.body;

    // Check if product exists
    const existingProduct = await Product.getById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = parseInt(category_id);
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (sku !== undefined) updateData.sku = sku;
    if (featured !== undefined) updateData.featured = featured === 'true';
    if (is_active !== undefined) updateData.is_active = is_active !== 'false';

    // Handle image upload
    if (req.file) {
      // Delete old image if it exists
      if (existingProduct.image_path) {
        const oldImagePath = existingProduct.image_path.replace('/uploads/', 'uploads/');
        deleteFile(oldImagePath);
      }
      updateData.image_path = getFileUrl(`products/${req.file.filename}`);
    }

    await Product.update(id, updateData);

    res.json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Get product to delete associated image
    const product = await Product.getById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete product image if it exists
    if (product.image_path) {
      const imagePath = product.image_path.replace('/uploads/', 'uploads/');
      deleteFile(imagePath);
    }

    // Delete product
    await Product.delete(id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

module.exports = {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};