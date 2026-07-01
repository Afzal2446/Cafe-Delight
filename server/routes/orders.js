const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { getDb, saveDb } = require('../db');
const { requireAuth } = require('../auth');

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
router.get('/', requireAuth, (req, res) => {
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
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, Number(req.params.id)]);
  res.json({ message: 'Status updated' });
});

// Get UPI payment link + QR code for an order
router.get('/:id/payment', async (req, res) => {
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [Number(req.params.id)]);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const settings = queryOne('SELECT cafe_name, upi_id, qr_image_url FROM owner_settings LIMIT 1') || {};
  if (!settings.upi_id) {
    return res.status(400).json({ error: 'Cafe has not configured a UPI ID yet' });
  }

  const payeeName = (settings.cafe_name || 'Cafe').replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Cafe';
  const amount = Number(order.total_amount).toFixed(2);
  const note = `Order ${order.id}`;

  // Standard UPI deep link — works with GPay, PhonePe, Paytm, WhatsApp Pay, etc.
  const upiLink = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}` +
    `&pn=${encodeURIComponent(payeeName)}` +
    `&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(upiLink, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
    res.json({
      upiLink,
      qr: qrDataUrl,
      upiId: settings.upi_id,
      payeeName,
      amount,
      qrImageUrl: settings.qr_image_url || null,
      paymentStatus: order.payment_status
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate payment QR' });
  }
});

// Confirm payment (customer declares amount paid) — this is only a CLAIM.
// It never marks the order 'paid'; the owner must verify against their UPI app.
router.post('/:id/confirm-payment', (req, res) => {
  const orderId = Number(req.params.id);
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  let paid = Number(req.body.paid_amount);
  if (isNaN(paid) || paid < 0) paid = 0;

  const total = Number(order.total_amount);
  // 'claimed' = customer says they paid the full amount (awaiting owner verification)
  // 'partial' = customer paid less than the total (short — owner is alerted)
  // 'unpaid'  = nothing paid
  const payment_status = paid <= 0 ? 'unpaid' : (paid + 0.01 >= total ? 'claimed' : 'partial');

  run('UPDATE orders SET paid_amount = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [paid, payment_status, orderId]);

  res.json({
    message: 'Payment reported',
    payment_status,
    paid_amount: paid,
    shortfall: Math.max(0, +(total - paid).toFixed(2))
  });
});

// Update payment status (owner)
router.patch('/:id/payment', requireAuth, (req, res) => {
  const { payment_status } = req.body;
  const orderId = Number(req.params.id);
  const order = queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // When owner marks as paid, record the full amount as received
  if (payment_status === 'paid') {
    run('UPDATE orders SET payment_status = ?, paid_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [payment_status, order.total_amount, orderId]);
  } else if (payment_status === 'unpaid') {
    run('UPDATE orders SET payment_status = ?, paid_amount = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [payment_status, orderId]);
  } else {
    run('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [payment_status, orderId]);
  }
  res.json({ message: 'Payment status updated' });
});

module.exports = router;
