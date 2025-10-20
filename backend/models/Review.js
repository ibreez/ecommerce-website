const { pool } = require('../config/database');

class Review {
  static async findAll(options = {}) {
    try {
      let query = `
        SELECT 
          r.*,
          u.name as user_name,
          p.name as product_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN products p ON r.product_id = p.id
        ORDER BY r.created_at DESC
      `;
      
      const params = [];

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
      console.error('Review findAll error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          r.*,
          u.name as user_name,
          p.name as product_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN products p ON r.product_id = p.id
        WHERE r.id = ?
      `;
      
      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Review findById error:', error);
      throw error;
    }
  }

  static async findByProduct(productId, options = {}) {
    try {
      let query = `
        SELECT 
          r.*,
          u.name as user_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
      `;
      
      const params = [productId];

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
      console.error('Review findByProduct error:', error);
      throw error;
    }
  }

  static async findByUserAndProduct(userId, productId) {
    try {
      const query = `SELECT * FROM reviews WHERE user_id = ? AND product_id = ?`;
      const [rows] = await pool.execute(query, [userId, productId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Review findByUserAndProduct error:', error);
      throw error;
    }
  }

  static async create(reviewData) {
    try {
      const { user_id, product_id, rating, comment } = reviewData;
      
      const query = `
        INSERT INTO reviews (user_id, product_id, rating, comment)
        VALUES (?, ?, ?, ?)
      `;

      const [result] = await pool.execute(query, [
        user_id, product_id, rating, comment
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Review create error:', error);
      throw error;
    }
  }

  static async update(id, reviewData) {
    try {
      const fields = [];
      const values = [];

      // Build dynamic update query
      Object.entries(reviewData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        return false;
      }

      values.push(id);
      const query = `UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`;
      
      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Review update error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `DELETE FROM reviews WHERE id = ?`;
      const [result] = await pool.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Review delete error:', error);
      throw error;
    }
  }
}

module.exports = Review;