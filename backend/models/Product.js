const { pool } = require('../config/database');

class Product {
  static async findAll(filters = {}, options = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          c.name as category_name,
          c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      
      const params = [];

      // Apply filters
      if (filters.category_id) {
        query += ` AND p.category_id = ?`;
        params.push(filters.category_id);
      }

      if (filters.search) {
        query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.featured !== null) {
        query += ` AND p.featured = ?`;
        params.push(filters.featured);
      }

      if (filters.is_active !== null) {
        query += ` AND p.is_active = ?`;
        params.push(filters.is_active);
      }

      // Apply sorting
      const sortBy = options.sort_by || 'created_at';
      const sortOrder = options.sort_order || 'DESC';
      query += ` ORDER BY p.${sortBy} ${sortOrder}`;

      // Apply pagination
      if (options.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);
        
        if (options.offset) {
          query += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Product findAll error:', error);
      throw error;
    }
  }

  static async count(filters = {}) {
    try {
      let query = `
        SELECT COUNT(*) as total
        FROM products p
        WHERE 1=1
      `;

      const params = [];

      if (filters.category_id) {
        query += ` AND p.category_id = ?`;
        params.push(filters.category_id);
      }

      if (filters.search) {
        query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.featured !== null) {
        query += ` AND p.featured = ?`;
        params.push(filters.featured);
      }

      if (filters.is_active !== null) {
        query += ` AND p.is_active = ?`;
        params.push(filters.is_active);
      }

      const [rows] = await pool.execute(query, params);
      return rows[0].total;
    } catch (error) {
      console.error('Product count error:', error);
      throw error;
    }
  }

  static async countCurrentMonth() {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM products
        WHERE YEAR(created_at) = YEAR(CURDATE())
        AND MONTH(created_at) = MONTH(CURDATE())
      `;
      const [rows] = await pool.execute(query);
      return rows[0].total;
    } catch (error) {
      console.error('Product countCurrentMonth error:', error);
      throw error;
    }
  }

  static async countPreviousMonth() {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM products
        WHERE YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      `;
      const [rows] = await pool.execute(query);
      return rows[0].total;
    } catch (error) {
      console.error('Product countPreviousMonth error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          p.*,
          c.name as category_name,
          c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `;
      
      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Product findById error:', error);
      throw error;
    }
  }

  static async findBySku(sku) {
    try {
      const query = `SELECT * FROM products WHERE sku = ?`;
      const [rows] = await pool.execute(query, [sku]);
      return rows[0] || null;
    } catch (error) {
      console.error('Product findBySku error:', error);
      throw error;
    }
  }

  static async create(productData) {
    try {
      const {
        name,
        description,
        category_id,
        price,
        stock,
        sku,
        image_path,
        featured = false,
        is_active = true
      } = productData;

      const query = `
        INSERT INTO products (
          name, description, category_id, price, stock, sku, image_path, featured, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await pool.execute(query, [
        name, description, category_id, price, stock, sku, image_path, featured, is_active
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Product create error:', error);
      throw error;
    }
  }

  static async update(id, productData) {
    try {
      const fields = [];
      const values = [];

      // Build dynamic update query
      Object.entries(productData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        return false;
      }

      values.push(id);
      const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
      
      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Product update error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `DELETE FROM products WHERE id = ?`;
      const [result] = await pool.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Product delete error:', error);
      throw error;
    }
  }
}

module.exports = Product;