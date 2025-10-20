const { pool } = require('../config/database');

class Order {
  static async findAll(filters = {}, options = {}) {
    try {
      let query = `
        SELECT
          o.*,
          u.name as customer_name,
          u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      // Apply filters
      if (filters.user_id) {
        query += ` AND o.user_id = ?`;
        params.push(filters.user_id);
      }

      if (filters.status) {
        query += ` AND o.status = ?`;
        params.push(filters.status);
      }

      // Apply sorting
      const sortBy = options.sort_by || 'created_at';
      const sortOrder = options.sort_order || 'DESC';
      query += ` ORDER BY o.${sortBy} ${sortOrder}`;

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
      console.error('Order findAll error:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT
          o.*,
          u.name as customer_name,
          u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `;

      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error('Order findById error:', error);
      throw error;
    }
  }

  // Alias methods for controller compatibility
  static async getById(id) {
    return this.findById(id);
  }

  static async getByIdWithItems(id) {
    try {
      const query = `
        SELECT
          o.id as order_id, o.*,
          u.name as customer_name,
          u.email as customer_email,
          oi.id as order_item_id, oi.product_id, oi.quantity, oi.price as item_price,
          p.name as product_name, p.sku as product_sku, p.image_path as product_image
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.id = ?
        ORDER BY oi.id ASC
      `;

      const [rows] = await pool.execute(query, [id]);

      if (rows.length === 0) return null;

      // Assemble order with items
      const order = Object.assign({}, rows[0]);
      delete order.order_item_id;
      delete order.product_id;
      delete order.quantity;
      delete order.item_price;
      delete order.product_name;
      delete order.product_sku;
      delete order.product_image;
      order.id = order.order_id;
      order.items = [];

      for (const r of rows) {
        if (r.order_item_id) {
          order.items.push({
            id: r.order_item_id,
            product_id: r.product_id,
            quantity: r.quantity,
            price: r.item_price,
            product: {
              id: r.product_id,
              name: r.product_name,
              sku: r.product_sku,
              image_path: r.product_image
            }
          });
        }
      }

      return order;
    } catch (error) {
      console.error('Order getByIdWithItems error:', error);
      throw error;
    }
  }

  static async getByUserId(userId) {
    try {
      const query = `
        SELECT o.* FROM orders o
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
      `;

      const [rows] = await pool.execute(query, [userId]);

      if (!rows || rows.length === 0) return rows;

      // Collect order ids and fetch item previews and counts in a single aggregated query
      const orderIds = rows.map(r => r.id);
      const placeholders = orderIds.map(() => '?').join(',');

      // Use window functions to number items per order, then aggregate first 3 items
      const itemsQuery = `
        SELECT t.order_id, t.items_count, GROUP_CONCAT(CONCAT(t.product_id, '::', t.name) ORDER BY t.rn SEPARATOR '||') AS items_concat
        FROM (
          SELECT oi.order_id, oi.product_id, COALESCE(p.name, '') AS name,
                 ROW_NUMBER() OVER (PARTITION BY oi.order_id ORDER BY oi.id) AS rn,
                 COUNT(*) OVER (PARTITION BY oi.order_id) AS items_count
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id IN (${placeholders})
        ) t
        WHERE t.rn <= 3
        GROUP BY t.order_id, t.items_count
      `;

      const [itemsRows] = await pool.execute(itemsQuery, orderIds);

      // Map the aggregated results back to orders
      const itemsMap = {};
      for (const r of itemsRows) {
        const concat = r.items_concat || '';
        const preview = concat.length > 0
          ? concat.split('||').filter(Boolean).map(s => {
              const [pid, name] = s.split('::');
              return { product_id: Number(pid), name };
            })
          : [];
        itemsMap[r.order_id] = { items_preview: preview, items_count: Number(r.items_count) || preview.length };
      }

      for (const row of rows) {
        if (itemsMap[row.id]) {
          row.items_preview = itemsMap[row.id].items_preview;
          row.items_count = itemsMap[row.id].items_count;
        } else {
          row.items_preview = [];
          row.items_count = 0;
        }
      }

      return rows;
    } catch (error) {
      console.error('Order getByUserId error:', error);
      throw error;
    }
  }

  // Return orders for a user with full items arrays (each item includes product info)
  static async getByUserIdWithItems(userId) {
    try {
      const query = `
        SELECT
          o.id as order_id, o.*,
          oi.id as order_item_id, oi.product_id, oi.quantity, oi.price as item_price,
          p.name as product_name, p.image_path as product_image
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC, oi.id ASC
      `;

      const [rows] = await pool.execute(query, [userId]);

      // Group rows by order_id to assemble items array
      const ordersMap = new Map();
      for (const r of rows) {
        const oid = r.order_id;
        if (!ordersMap.has(oid)) {
          // clone order-level fields
          const order = Object.assign({}, r);
          // remove item-specific fields from order
          delete order.order_item_id;
          delete order.product_id;
          delete order.quantity;
          delete order.item_price;
          delete order.product_name;
          delete order.product_image;
          // ensure id is numeric
          order.id = oid;
          order.items = [];
          ordersMap.set(oid, order);
        }

        if (r.order_item_id) {
          const order = ordersMap.get(oid);
          order.items.push({
            id: r.order_item_id,
            product_id: r.product_id,
            quantity: r.quantity,
            price: r.item_price,
            product: {
              id: r.product_id,
              name: r.product_name,
              image_path: r.product_image
            }
          });
        }
      }

      // If there were no order_items rows (rows may still include order-level entries), ensure we include orders without items
      if (rows.length === 0) {
        // fallback: fetch orders (no items)
        const [ordersOnly] = await pool.execute(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
        return ordersOnly;
      }

      // Return values as array ordered by created_at desc
      return Array.from(ordersMap.values());
    } catch (error) {
      console.error('Order getByUserIdWithItems error:', error);
      throw error;
    }
  }

  static async getAll(options = {}) {
    try {
      let query = `
        SELECT
          o.*,
          u.name as customer_name,
          u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
      `;

      const params = [];

      if (options.status) {
        query += ` WHERE o.status = ?`;
        params.push(options.status);
      }

      query += ` ORDER BY o.created_at DESC`;

      // Count total for pagination
      let countQuery = `SELECT COUNT(*) as total FROM orders o`;
      if (options.status) {
        countQuery += ` WHERE o.status = ?`;
      }

      const [countResult] = await pool.execute(countQuery, options.status ? [options.status] : []);
      const total = countResult[0].total;

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
      return { orders: rows, total };
    } catch (error) {
      console.error('Order getAll error:', error);
      throw error;
    }
  }

  static async create(orderData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        user_id,
        items,
        total_amount,
        shipping_address,
        phone,
        payment_method,
        notes,
        status = 'pending'
      } = orderData;

      const query = `
        INSERT INTO orders (
          user_id, total_amount, shipping_address, phone, payment_method, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(query, [
        user_id, total_amount, shipping_address, phone, payment_method, notes, status
      ]);

      const orderId = result.insertId;

      // Insert order items
      if (items && Array.isArray(items)) {
        const itemQuery = `
          INSERT INTO order_items (order_id, product_id, quantity, price)
          VALUES (?, ?, ?, ?)
        `;

        for (const item of items) {
          await connection.execute(itemQuery, [
            orderId,
            item.product_id,
            item.quantity,
            item.price
          ]);

          // Update product stock
          await connection.execute(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }

      await connection.commit();
      return orderId;
    } catch (error) {
      await connection.rollback();
      console.error('Order create error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async update(id, orderData) {
    try {
      const fields = [];
      const values = [];

      // Build dynamic update query
      Object.entries(orderData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'items' && typeof value === 'object') {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });

      if (fields.length === 0) {
        return false;
      }

      values.push(id);
      const query = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;

      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Order update error:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const query = `UPDATE orders SET status = ? WHERE id = ?`;
      const [result] = await pool.execute(query, [status, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Order updateStatus error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `DELETE FROM orders WHERE id = ?`;
      const [result] = await pool.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Order delete error:', error);
      throw error;
    }
  }

  static async countCurrentMonth() {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM orders
        WHERE YEAR(created_at) = YEAR(CURDATE())
        AND MONTH(created_at) = MONTH(CURDATE())
      `;
      const [rows] = await pool.execute(query);
      return rows[0].total;
    } catch (error) {
      console.error('Order countCurrentMonth error:', error);
      throw error;
    }
  }

  static async countPreviousMonth() {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM orders
        WHERE YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      `;
      const [rows] = await pool.execute(query);
      return rows[0].total;
    } catch (error) {
      console.error('Order countPreviousMonth error:', error);
      throw error;
    }
  }

  static async revenueCurrentMonth() {
    try {
      const query = `
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE YEAR(created_at) = YEAR(CURDATE())
        AND MONTH(created_at) = MONTH(CURDATE())
      `;
      const [rows] = await pool.execute(query);
      return rows[0].total;
    } catch (error) {
      console.error('Order revenueCurrentMonth error:', error);
      throw error;
    }
  }

  static async revenuePreviousMonth() {
    try {
      const query = `
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      `;
      const [rows] = await pool.execute(query);
      return rows[0].total;
    } catch (error) {
      console.error('Order revenuePreviousMonth error:', error);
      throw error;
    }
  }

  static async updateAdminNotes(id, adminNotes) {
    try {
      const query = `UPDATE orders SET admin_notes = ? WHERE id = ?`;
      const [result] = await pool.execute(query, [adminNotes, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Order updateAdminNotes error:', error);
      throw error;
    }
  }

  static async getPendingOrders() {
    try {
      const query = `
        SELECT
          o.*,
          u.name as customer_name,
          u.email as customer_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.status != 'delivered' AND o.status != 'cancelled'
        ORDER BY o.created_at DESC
      `;

      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      console.error('Order getPendingOrders error:', error);
      throw error;
    }
  }
}

module.exports = Order;
