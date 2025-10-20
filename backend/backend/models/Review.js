const { pool } = require('../config/database');

class Review {
  static async create(reviewData) {
    const { user_id, product_id, rating, comment } = reviewData;
    
    const [result] = await pool.execute(
      'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
      [user_id, product_id, rating, comment]
    );
    
    return result.insertId;
  }

  static async findByProductId(productId, approvedOnly = true) {
    let query = `
      SELECT r.*, u.name as user_name 
      FROM reviews r 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE r.product_id = ?
    `;
    
    if (approvedOnly) {
      query += ' AND r.is_approved = TRUE';
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const [reviews] = await pool.execute(query, [productId]);
    return reviews;
  }

  static async findById(id) {
    const [reviews] = await pool.execute(
      `SELECT r.*, u.name as user_name, p.name as product_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       LEFT JOIN products p ON r.product_id = p.id 
       WHERE r.id = ?`,
      [id]
    );
    
    return reviews[0] || null;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT r.*, u.name as user_name, p.name as product_name 
      FROM reviews r 
      LEFT JOIN users u ON r.user_id = u.id 
      LEFT JOIN products p ON r.product_id = p.id
    `;
    
    const conditions = [];
    const values = [];
    
    if (filters.approved !== undefined) {
      conditions.push('r.is_approved = ?');
      values.push(filters.approved);
    }
    
    if (filters.product_id) {
      conditions.push('r.product_id = ?');
      values.push(filters.product_id);
    }
    
    if (filters.user_id) {
      conditions.push('r.user_id = ?');
      values.push(filters.user_id);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      values.push(parseInt(filters.limit));
    }
    
    const [reviews] = await pool.execute(query, values);
    return reviews;
  }

  static async updateApproval(id, isApproved) {
    const [result] = await pool.execute(
      'UPDATE reviews SET is_approved = ? WHERE id = ?',
      [isApproved, id]
    );
    
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM reviews WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  static async findUserReviewForProduct(userId, productId) {
    const [reviews] = await pool.execute(
      'SELECT * FROM reviews WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    
    return reviews[0] || null;
  }
}

module.exports = Review;