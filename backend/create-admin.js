require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'electronics_ecommerce'
  };

const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });

  await connection.query(`USE \`${dbConfig.database}\``);

  try {
    const email = 'admin@example.com';
    const password = 'admin123';
    const name = 'Admin User';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if admin exists
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length === 0) {
      await connection.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'admin']
      );
      console.log(`Admin user created: ${email} with password ${password}`);
    } else {
      console.log(`Admin user already exists: ${email}`);
    }
  } catch (error) {
    console.error('Admin creation error:', error);
  } finally {
    await connection.end();
  }
}

createAdmin().catch(console.error);
