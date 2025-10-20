const { pool } = require('./config/database');

async function addFeviTagColumn() {
  try {
    await pool.execute('ALTER TABLE settings ADD COLUMN site_fevi_tag VARCHAR(255) DEFAULT \'NJ\' AFTER site_description');
    console.log('Column site_fevi_tag added successfully');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    process.exit(0);
  }
}

addFeviTagColumn();
