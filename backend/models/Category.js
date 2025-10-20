const { pool } = require('../config/database');

class Category {
  static async findAll(activeOnly = false) {
    try {
      let query = `
        SELECT c.*, COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
      `;
      const params = [];

      if (activeOnly) {
        query += ` WHERE c.is_active = ?`;
        params.push(true);
      }

      query += ` GROUP BY c.id ORDER BY c.name ASC`;

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Category findAll error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `SELECT * FROM categories WHERE id = ?`;
      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Category findById error:', error);
      throw error;
    }
  }

  static async findBySlug(slug) {
    try {
      const query = `SELECT * FROM categories WHERE slug = ?`;
      const [rows] = await pool.execute(query, [slug]);
      return rows[0] || null;
    } catch (error) {
      console.error('Category findBySlug error:', error);
      throw error;
    }
  }

  static async create(categoryData) {
    try {
      const { name, slug, description, image_path, is_active } = categoryData;

      const query = `
        INSERT INTO categories (name, slug, description, image_path, is_active)
        VALUES (?, ?, ?, ?, ?)
      `;

      const [result] = await pool.execute(query, [
        name, slug, description, image_path, is_active
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Category create error:', error);
      throw error;
    }
  }

  static async update(id, categoryData) {
    try {
      const fields = [];
      const values = [];

      // Build dynamic update query
      Object.entries(categoryData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        return false;
      }

      values.push(id);
      const query = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
      
      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Category update error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `DELETE FROM categories WHERE id = ?`;
      const [result] = await pool.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Category delete error:', error);
      throw error;
    }
  }
}

module.exports = Category;