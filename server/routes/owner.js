const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');

function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  saveDb();
}

// --- MENU MANAGEMENT ---

router.post('/menu', (req, res) => {
  const { name, description, price, category_id, image_url } = req.body;
  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }
  try {
    run('INSERT INTO menu_items (name, description, price, category_id, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', price, category_id, image_url || '']);
    const db = getDb();
    const result = db.exec('SELECT last_insert_rowid() as id');
    res.status(201).json({ id: result[0].values[0][0], message: 'Item added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/menu/:id', (req, res) => {
  const { name, description, price, category_id, image_url, is_available } = req.body;
  try {
    const current = queryOne('SELECT * FROM menu_items WHERE id = ?', [Number(req.params.id)]);
    if (!current) return res.status(404).json({ error: 'Item not found' });

    run(`UPDATE menu_items SET name = ?, description = ?, price = ?, category_id = ?, image_url = ?, is_available = ? WHERE id = ?`, [
      name ?? current.name,
      description ?? current.description,
      price ?? current.price,
      category_id ?? current.category_id,
      image_url ?? current.image_url,
      is_available ?? current.is_available,
      Number(req.params.id)
    ]);
    res.json({ message: 'Item updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/menu/:id', (req, res) => {
  run('DELETE FROM menu_items WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Item deleted' });
});

// --- CATEGORY MANAGEMENT ---

router.post('/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  try {
    run('INSERT INTO categories (name) VALUES (?)', [name]);
    const db = getDb();
    const result = db.exec('SELECT last_insert_rowid() as id');
    res.status(201).json({ id: result[0].values[0][0], message: 'Category added' });
  } catch (err) {
    res.status(400).json({ error: 'Category already exists' });
  }
});

router.delete('/categories/:id', (req, res) => {
  const items = queryOne('SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?', [Number(req.params.id)]);
  if (items && items.count > 0) {
    return res.status(400).json({ error: 'Cannot delete category with menu items' });
  }
  run('DELETE FROM categories WHERE id = ?', [Number(req.params.id)]);
  res.json({ message: 'Category deleted' });
});

// --- SETTINGS ---

router.get('/settings', (req, res) => {
  const settings = queryOne('SELECT * FROM owner_settings LIMIT 1');
  res.json(settings || {});
});

router.put('/settings', (req, res) => {
  const { cafe_name, upi_id, qr_image_url, contact_number, address } = req.body;
  const existing = queryOne('SELECT id FROM owner_settings LIMIT 1');
  if (existing) {
    run('UPDATE owner_settings SET cafe_name = ?, upi_id = ?, qr_image_url = ?, contact_number = ?, address = ? WHERE id = ?',
      [cafe_name, upi_id, qr_image_url, contact_number, address, existing.id]);
  } else {
    run('INSERT INTO owner_settings (cafe_name, upi_id, qr_image_url, contact_number, address) VALUES (?, ?, ?, ?, ?)',
      [cafe_name, upi_id, qr_image_url, contact_number, address]);
  }
  res.json({ message: 'Settings updated' });
});

// --- DASHBOARD STATS ---

router.get('/stats', (req, res) => {
  const db = getDb();
  const scalar = (sql) => db.exec(sql)[0]?.values[0][0] || 0;

  const totalOrders = scalar('SELECT COUNT(*) FROM orders');
  const todayOrders = scalar("SELECT COUNT(*) FROM orders WHERE date(created_at) = date('now')");
  const todayRevenue = scalar("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'");
  const weekOrders = scalar("SELECT COUNT(*) FROM orders WHERE date(created_at) >= date('now', '-6 days')");
  const weekRevenue = scalar("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE date(created_at) >= date('now', '-6 days') AND status != 'cancelled'");
  const monthOrders = scalar("SELECT COUNT(*) FROM orders WHERE date(created_at) >= date('now', 'start of month')");
  const monthRevenue = scalar("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE date(created_at) >= date('now', 'start of month') AND status != 'cancelled'");
  const pendingOrders = scalar("SELECT COUNT(*) FROM orders WHERE status = 'pending'");
  const totalItems = scalar('SELECT COUNT(*) FROM menu_items');

  res.json({
    totalOrders, todayOrders, todayRevenue,
    weekOrders, weekRevenue, monthOrders, monthRevenue,
    pendingOrders, totalItems
  });
});

// --- DATE RANGE REPORT ---

router.get('/stats/range', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end dates are required (YYYY-MM-DD)' });
  }

  const orders = queryAll(
    `SELECT * FROM orders
     WHERE date(created_at) BETWEEN date(?) AND date(?)
     ORDER BY created_at DESC`,
    [start, end]
  );

  const validOrders = orders.filter(o => o.status !== 'cancelled');
  const revenue = validOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  res.json({
    start,
    end,
    orderCount: orders.length,
    revenue: +revenue.toFixed(2),
    cancelledCount: orders.length - validOrders.length,
    orders
  });
});

module.exports = router;
