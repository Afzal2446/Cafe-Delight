const { createClient } = require('@libsql/client');
const path = require('path');

// In production, set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (from Turso).
// In local dev, fall back to an embedded libSQL file so no cloud creds are needed.
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'cafe-libsql.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

// --- Query helpers (all async) ---
async function queryAll(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res.rows;
}

async function queryOne(sql, args = []) {
  const rows = await queryAll(sql, args);
  return rows[0] || null;
}

// Runs INSERT/UPDATE/DELETE. Returns { lastInsertRowid, rowsAffected }.
async function execute(sql, args = []) {
  const res = await client.execute({ sql, args });
  return {
    lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null,
    rowsAffected: res.rowsAffected
  };
}

// Returns the first column of the first row (for COUNT/SUM/AVG queries). Alias the column.
async function scalar(sql, args = []) {
  const row = await queryOne(sql, args);
  if (!row) return 0;
  const v = Object.values(row)[0];
  return v == null ? 0 : v;
}

async function initDb() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
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

  await client.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER,
      customer_name TEXT,
      status TEXT DEFAULT 'pending',
      payment_mode TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
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

  // Defensive migration for older databases missing paid_amount
  const cols = await client.execute('PRAGMA table_info(orders)');
  const hasPaid = cols.rows.some(r => r.name === 'paid_amount');
  if (!hasPaid) {
    await client.execute('ALTER TABLE orders ADD COLUMN paid_amount REAL DEFAULT 0');
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS owner_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_name TEXT DEFAULT 'My Cafe',
      upi_id TEXT,
      qr_image_url TEXT,
      contact_number TEXT,
      address TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      rating INTEGER NOT NULL,
      message TEXT,
      order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed initial data only if empty
  const count = await scalar('SELECT COUNT(*) AS c FROM categories');
  if (Number(count) === 0) {
    const categories = ['Tea', 'Coffee', 'Snacks', 'Dinner', 'Beverages', 'Desserts'];
    for (const c of categories) {
      await client.execute({ sql: 'INSERT INTO categories (name) VALUES (?)', args: [c] });
    }

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
    for (const [name, desc, price, catId] of items) {
      await client.execute({
        sql: 'INSERT INTO menu_items (name, description, price, category_id) VALUES (?, ?, ?, ?)',
        args: [name, desc, price, catId]
      });
    }

    await client.execute({
      sql: 'INSERT INTO owner_settings (cafe_name, upi_id) VALUES (?, ?)',
      args: ['Cafe Delight', 'afzal2446947@okicici']
    });
  }
}

module.exports = { initDb, queryAll, queryOne, execute, scalar, client };
