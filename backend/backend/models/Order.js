const { pool } = require('../config/database');

class Order {
  static async create(orderData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { user_id, total_amount, payment_method, shipping_address, phone, notes, items } = orderData;
      
      // Create order
      const [orderResult] = await connection.execute(
        'INSERT INTO orders (user_id, total_amount, payment_method, shipping_address, phone, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [user_id, total_amount, payment_method, shipping_address, phone, notes]
      );
      
      const orderId = orderResult.insertId;
      
      // Create order items
      for (const item of items) {
        await connection.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price]
        );
        
        // Update product stock
        await connection.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      
      await connection.commit();
      return orderId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const [orders] = await pool.execute(
      `SELECT o.*, u.name as user_name, u.email as user_email 
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id 
       WHERE o.id = ?`,
      [id]
    );
    
    if (orders.length === 0) return null;
    
    const order = orders[0];
    
    // Get order items
    const [items] = await pool.execute(
      `SELECT oi.*, p.name as product_name, p.sku as product_sku 
       FROM order_items oi 
       LEFT JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [id]
    );
    
    order.items = items;
    return order;
  }

  static async findByUserId(userId, limit = null) {
    let query = `
      SELECT o.*, COUNT(oi.id) as item_count 
      FROM orders o 
      LEFT JOIN order_items oi ON o.id = oi.order_id 
      WHERE o.user_id = ? 
      GROUP BY o.id 
      ORDER BY o.created_at DESC
    `;
    
    const params = [userId];
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    
    const [orders] = await pool.execute(query, params);
    return orders;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT o.*, u.name as user_name, u.email as user_email, COUNT(oi.id) as item_count 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    const conditions = [];
    const values = [];
    
    if (filters.status) {
      conditions.push('o.status = ?');
      values.push(filters.status);
    }
    
    if (filters.payment_method) {
      conditions.push('o.payment_method = ?');
      values.push(filters.payment_method);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY o.id ORDER BY o.created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      values.push(parseInt(filters.limit));
    }
    
    const [orders] = await pool.execute(query, values);
    return orders;
  }

  static async updateStatus(id, status) {
    const [result] = await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    return result.affectedRows > 0;
  }

  static async update(id, orderData) {
    const fields = [];
    const values = [];
    
    Object.keys(orderData).forEach(key => {
      if (orderData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(orderData[key]);
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const [result] = await pool.execute(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  }
}

module.exports = Order;