const { pool } = require('../config/database');

class Receipt {
  static async findAll(filters = {}, options = {}) {
    try {
      let query = `
        SELECT 
          r.*,
          o.total_amount,
          u.name as customer_name,
          u.email as customer_email
        FROM receipts r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `;
      
      const params = [];

      // Apply filters
      if (filters.order_id) {
        query += ` AND r.order_id = ?`;
        params.push(filters.order_id);
      }

      if (filters.user_id) {
        query += ` AND o.user_id = ?`;
        params.push(filters.user_id);
      }

      // Apply sorting
      const sortBy = options.sort_by || 'created_at';
      const sortOrder = options.sort_order || 'DESC';
      query += ` ORDER BY r.${sortBy} ${sortOrder}`;

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
      console.error('Receipt findAll error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          r.*,
          o.total_amount,
          u.name as customer_name,
          u.email as customer_email
        FROM receipts r
        LEFT JOIN orders o ON r.order_id = o.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE r.id = ?
      `;
      
      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Receipt findById error:', error);
      throw error;
    }
  }

  static async findByOrderId(orderId) {
    try {
      const query = `SELECT * FROM receipts WHERE order_id = ?`;
      const [rows] = await pool.execute(query, [orderId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Receipt findByOrderId error:', error);
      throw error;
    }
  }

  static async create(receiptData) {
    try {
      const {
        order_id,
        receipt_number,
        amount,
        payment_method,
        transaction_id
      } = receiptData;

      const query = `
        INSERT INTO receipts (
          order_id, receipt_number, amount, payment_method, transaction_id
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const [result] = await pool.execute(query, [
        order_id, receipt_number, amount, payment_method, transaction_id
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Receipt create error:', error);
      throw error;
    }
  }

  static async update(id, receiptData) {
    try {
      const fields = [];
      const values = [];

      // Build dynamic update query
      Object.entries(receiptData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        return false;
      }

      values.push(id);
      const query = `UPDATE receipts SET ${fields.join(', ')} WHERE id = ?`;
      
      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Receipt update error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `DELETE FROM receipts WHERE id = ?`;
      const [result] = await pool.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Receipt delete error:', error);
      throw error;
    }
  }
}

module.exports = Receipt;