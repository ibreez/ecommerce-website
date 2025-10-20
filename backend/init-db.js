const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { generateToken } = require('./utils/auth');

async function initDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'electronics_ecommerce',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });

  // Create database if not exists
  await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
  await connection.execute(`USE ${dbConfig.database}`);

  try {
    // Run schema
    const schemaSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin', 'superadmin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Categories table (minimal for testing)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_path VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
);

-- Products table (minimal)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    image_path VARCHAR(500),
    sku VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_price (price),
    INDEX idx_stock (stock),
    INDEX idx_sku (sku),
    INDEX idx_active (is_active),
    INDEX idx_featured (featured)
);

-- Settings table (key-value store for application settings)
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
);
    `;

    await connection.execute(schemaSQL);

    // Insert sample categories if none
    const [categories] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    if (categories[0].count === 0) {
      await connection.execute(`
        INSERT INTO categories (name, slug, description) VALUES
        ('Relays', 'relays', 'Electronic relays'),
        ('Resistors', 'resistors', 'Electronic resistors');
      `);
    }

    // Create test user
    const email = 'test@example.com';
    const password = 'password123';
    const name = 'Test User';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length === 0) {
      await connection.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'user']
      );
      console.log(`Test user created: ${email} with password ${password}`);
    } else {
      console.log(`Test user already exists: ${email}`);
    }

    // Insert sample product if needed
    const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
    if (products[0].count === 0) {
      const [cat] = await connection.execute('SELECT id FROM categories LIMIT 1');
      if (cat.length > 0) {
        await connection.execute(
          'INSERT INTO products (name, description, category_id, price, stock, sku) VALUES (?, ?, ?, ?, ?, ?)',
          ['Test Product', 'Test description', cat[0].id, 10.99, 10, 'TEST-001']
        );
        console.log('Sample product created');
      }
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    await connection.end();
  }
}

initDatabase().catch(console.error);
