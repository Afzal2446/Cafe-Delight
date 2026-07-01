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

// Place a new order
router.post('/', (req, res) => {
  const { table_number, customer_name, items, payment_mode, notes } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Order must have at least one item' });
  }

  const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const db = getDb();

  try {
    db.run('INSERT INTO orders (table_number, customer_name, payment_mode, total_amount, notes) VALUES (?, ?, ?, ?, ?)',
      [table_number || null, customer_name || null, payment_mode || 'cash', total_amount, notes || null]);

    const result = db.exec('SELECT last_insert_rowid() as id');
    const orderId = result[0].values[0][0];

    items.forEach(item => {
      db.run('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.menu_item_id, item.quantity, item.price]);
    });

    saveDb();
    res.status(201).json({ id: orderId, message: 'Order placed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all orders (owner)
router.get('/', (req, res) => {
  const { status } = req.query;
  let orders;
  if (status) {
    orders = queryAll('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC', [status]);
  } else {
    orders = queryAll('SELECT * FROM orders ORDER BY created_at DESC');
  }
  res.json(orders);
});

// Get order details
router.get('/:id', (req, res) => {
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = queryAll(`
    SELECT oi.*, mi.name as item_name, mi.description 
    FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id 
    WHERE oi.order_id = ?
  `, [Number(req.params.id)]);

  res.json({ ...order, items });
});

// Update order status (owner)
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, Number(req.params.id)]);
  res.json({ message: 'Status updated' });
});

// Update payment status (owner)
router.patch('/:id/payment', (req, res) => {
  const { payment_status } = req.body;
  run('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [payment_status, Number(req.params.id)]);
  res.json({ message: 'Payment status updated' });
});

module.exports = router;
