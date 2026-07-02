const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute, scalar } = require('../db');

// --- MENU MANAGEMENT ---

router.post('/menu', async (req, res) => {
  const { name, description, price, category_id, image_url } = req.body;
  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }
  try {
    const result = await execute(
      'INSERT INTO menu_items (name, description, price, category_id, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', price, category_id, image_url || '']
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Item added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/menu/:id', async (req, res) => {
  const { name, description, price, category_id, image_url, is_available } = req.body;
  try {
    const current = await queryOne('SELECT * FROM menu_items WHERE id = ?', [Number(req.params.id)]);
    if (!current) return res.status(404).json({ error: 'Item not found' });

    await execute(
      `UPDATE menu_items SET name = ?, description = ?, price = ?, category_id = ?, image_url = ?, is_available = ? WHERE id = ?`,
      [
        name ?? current.name,
        description ?? current.description,
        price ?? current.price,
        category_id ?? current.category_id,
        image_url ?? current.image_url,
        is_available ?? current.is_available,
        Number(req.params.id)
      ]
    );
    res.json({ message: 'Item updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/menu/:id', async (req, res) => {
  try {
    await execute('DELETE FROM menu_items WHERE id = ?', [Number(req.params.id)]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CATEGORY MANAGEMENT ---

router.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  try {
    const result = await execute('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Category added' });
  } catch (err) {
    res.status(400).json({ error: 'Category already exists' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const count = await scalar('SELECT COUNT(*) AS c FROM menu_items WHERE category_id = ?', [Number(req.params.id)]);
    if (Number(count) > 0) {
      return res.status(400).json({ error: 'Cannot delete category with menu items' });
    }
    await execute('DELETE FROM categories WHERE id = ?', [Number(req.params.id)]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SETTINGS ---

router.get('/settings', async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM owner_settings LIMIT 1');
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', async (req, res) => {
  const { cafe_name, upi_id, qr_image_url, contact_number, address } = req.body;
  try {
    const existing = await queryOne('SELECT id FROM owner_settings LIMIT 1');
    if (existing) {
      await execute('UPDATE owner_settings SET cafe_name = ?, upi_id = ?, qr_image_url = ?, contact_number = ?, address = ? WHERE id = ?',
        [cafe_name, upi_id, qr_image_url, contact_number, address, existing.id]);
    } else {
      await execute('INSERT INTO owner_settings (cafe_name, upi_id, qr_image_url, contact_number, address) VALUES (?, ?, ?, ?, ?)',
        [cafe_name, upi_id, qr_image_url, contact_number, address]);
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DASHBOARD STATS ---

router.get('/stats', async (req, res) => {
  try {
    const totalOrders = await scalar('SELECT COUNT(*) AS c FROM orders');
    const todayOrders = await scalar("SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = date('now')");
    const todayRevenue = await scalar("SELECT COALESCE(SUM(total_amount), 0) AS c FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'");
    const weekOrders = await scalar("SELECT COUNT(*) AS c FROM orders WHERE date(created_at) >= date('now', '-6 days')");
    const weekRevenue = await scalar("SELECT COALESCE(SUM(total_amount), 0) AS c FROM orders WHERE date(created_at) >= date('now', '-6 days') AND status != 'cancelled'");
    const monthOrders = await scalar("SELECT COUNT(*) AS c FROM orders WHERE date(created_at) >= date('now', 'start of month')");
    const monthRevenue = await scalar("SELECT COALESCE(SUM(total_amount), 0) AS c FROM orders WHERE date(created_at) >= date('now', 'start of month') AND status != 'cancelled'");
    const pendingOrders = await scalar("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'");
    const totalItems = await scalar('SELECT COUNT(*) AS c FROM menu_items');

    res.json({
      totalOrders, todayOrders, todayRevenue,
      weekOrders, weekRevenue, monthOrders, monthRevenue,
      pendingOrders, totalItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DATE RANGE REPORT ---

router.get('/stats/range', async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end dates are required (YYYY-MM-DD)' });
  }
  try {
    const orders = await queryAll(
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
