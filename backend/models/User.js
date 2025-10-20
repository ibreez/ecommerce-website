const { pool } = require('../config/database');

class User {
  static async create(userData) {
    const { name, email, password_hash, role = 'user' } = userData;

    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role]
    );

    return result.insertId;
  }

  static async findByEmail(email) {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    return users[0] || null;
  }

  static async findById(id) {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, created_at, password_hash FROM users WHERE id = ?',
      [id]
    );

    return users[0] || null;
  }

  static async findAll(role = null) {
    let query = 'SELECT id, name, email, role, created_at FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';
    const [users] = await pool.execute(query, params);
    return users;
  }

  static async delete(id) {
    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }

  static async update(id, userData) {
    const fields = [];
    const values = [];

    Object.keys(userData).forEach(key => {
      if (userData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(userData[key]);
      }
    });

    if (fields.length === 0) throw new Error('No fields to update');

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  static async countCurrentMonth() {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM users
        WHERE YEAR(created_at) = YEAR(CURDATE())
        AND MONTH(created_at) = MONTH(CURDATE())
      `;
      const [rows] = await pool.execute(query);
      return rows[0].total;
    } catch (error) {
      console.error('User countCurrentMonth error:', error);
      throw error;
    }
  }

  static async countPreviousMonth() {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM users
        WHERE YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      `;
      const [rows] = await pool.execute(query);
      return rows[0].total;
    } catch (error) {
      console.error('User countPreviousMonth error:', error);
      throw error;
    }
  }
}

module.exports = User;
