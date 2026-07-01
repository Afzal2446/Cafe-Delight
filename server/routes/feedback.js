const express = require('express');
const router = express.Router();
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

function run(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  saveDb();
}

// Submit feedback (customer — public)
router.post('/', (req, res) => {
  const { customer_name, rating, message, order_id } = req.body;
  const r = Number(rating);
  if (isNaN(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Please provide a rating between 1 and 5' });
  }
  run('INSERT INTO feedback (customer_name, rating, message, order_id) VALUES (?, ?, ?, ?)',
    [customer_name || null, r, message || null, order_id || null]);
  res.status(201).json({ message: 'Thanks for your feedback!' });
});

// List feedback (owner only)
router.get('/', requireAuth, (req, res) => {
  const rows = queryAll('SELECT * FROM feedback ORDER BY created_at DESC');
  const db = getDb();
  const avg = db.exec('SELECT AVG(rating), COUNT(*) FROM feedback')[0]?.values[0] || [0, 0];
  res.json({
    feedback: rows,
    averageRating: avg[0] ? +Number(avg[0]).toFixed(1) : 0,
    total: avg[1] || 0
  });
});

module.exports = router;
