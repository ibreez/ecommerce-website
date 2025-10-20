const { pool: db } = require('../config/database');

class Receipt {
  static async create(receiptData) {
    try {
      const { order_id, file_path, uploaded_by } = receiptData;
      
      const [result] = await db.execute(
        'INSERT INTO receipts (order_id, file_path, uploaded_by) VALUES (?, ?, ?)',
        [order_id, file_path, uploaded_by]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Create receipt error:', error);
      throw error;
    }
  }

  static async getByOrderId(orderId) {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, u.name as uploaded_by_name 
         FROM receipts r
         LEFT JOIN users u ON r.uploaded_by = u.id
         WHERE r.order_id = ?
         ORDER BY r.created_at DESC`,
        [orderId]
      );
      
      return rows;
    } catch (error) {
      console.error('Get receipts by order error:', error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT r.*, u.name as uploaded_by_name, o.id as order_id
         FROM receipts r
         LEFT JOIN users u ON r.uploaded_by = u.id
         LEFT JOIN orders o ON r.order_id = o.id
         WHERE r.id = ?`,
        [id]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error('Get receipt by id error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const [result] = await db.execute('DELETE FROM receipts WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Delete receipt error:', error);
      throw error;
    }
  }

  static async getAll(options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const [rows] = await db.execute(
        `SELECT r.*, u.name as uploaded_by_name, o.id as order_id, o.total_amount
         FROM receipts r
         LEFT JOIN users u ON r.uploaded_by = u.id
         LEFT JOIN orders o ON r.order_id = o.id
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      const [countResult] = await db.execute('SELECT COUNT(*) as total FROM receipts');
      
      return {
        receipts: rows,
        total: countResult[0].total
      };
    } catch (error) {
      console.error('Get all receipts error:', error);
      throw error;
    }
  }
}

module.exports = Receipt;