const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Use persistent disk path in production, local path in dev
const DATA_DIR = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, 'data')
  : __dirname;

const DB_PATH = path.join(DATA_DIR, 'cafe.db');

let db;

async function initDb() {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category_id INTEGER NOT NULL,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER,
      customer_name TEXT,
      status TEXT DEFAULT 'pending',
      payment_mode TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS owner_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_name TEXT DEFAULT 'My Cafe',
      upi_id TEXT,
      qr_image_url TEXT,
      contact_number TEXT,
      address TEXT
    )
  `);

  // Seed data if empty
  const result = db.exec('SELECT COUNT(*) as count FROM categories');
  const count = result[0]?.values[0][0] || 0;

  if (count === 0) {
    const categories = ['Tea', 'Coffee', 'Snacks', 'Dinner', 'Beverages', 'Desserts'];
    categories.forEach(c => db.run('INSERT INTO categories (name) VALUES (?)', [c]));

    const items = [
      ['Masala Tea', 'Traditional Indian masala chai', 30, 1],
      ['Green Tea', 'Healthy green tea', 40, 1],
      ['Cappuccino', 'Creamy cappuccino', 80, 2],
      ['Espresso', 'Strong espresso shot', 60, 2],
      ['Cold Coffee', 'Iced cold coffee with cream', 90, 2],
      ['Samosa', 'Crispy potato samosa (2 pcs)', 30, 3],
      ['Sandwich', 'Grilled veg sandwich', 60, 3],
      ['French Fries', 'Crispy salted fries', 70, 3],
      ['Paneer Butter Masala', 'Rich creamy paneer curry with naan', 180, 4],
      ['Dal Tadka', 'Yellow dal with rice', 120, 4],
      ['Lemon Soda', 'Fresh lemon soda', 40, 5],
      ['Gulab Jamun', 'Sweet gulab jamun (2 pcs)', 50, 6]
    ];
    items.forEach(([name, desc, price, catId]) => {
      db.run('INSERT INTO menu_items (name, description, price, category_id) VALUES (?, ?, ?, ?)', [name, desc, price, catId]);
    });

    db.run('INSERT INTO owner_settings (cafe_name, upi_id) VALUES (?, ?)', ['Cafe Delight', 'cafe@upi']);
  }

  saveDb();
  return db;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() {
  return db;
}

module.exports = { initDb, getDb, saveDb };
