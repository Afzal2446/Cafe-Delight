const express = require('express');
const router = express.Router();
const { queryAll, queryOne, execute } = require('../db');
const { requireAuth } = require('../auth');

// Submit feedback (customer — public)
router.post('/', async (req, res) => {
  const { customer_name, rating, message, order_id } = req.body;
  const r = Number(rating);
  if (isNaN(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Please provide a rating between 1 and 5' });
  }
  try {
    await execute('INSERT INTO feedback (customer_name, rating, message, order_id) VALUES (?, ?, ?, ?)',
      [customer_name || null, r, message || null, order_id || null]);
    res.status(201).json({ message: 'Thanks for your feedback!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List feedback (owner only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await queryAll('SELECT * FROM feedback ORDER BY created_at DESC');
    const stats = await queryOne('SELECT AVG(rating) AS avg, COUNT(*) AS total FROM feedback');
    res.json({
      feedback: rows,
      averageRating: stats && stats.avg != null ? +Number(stats.avg).toFixed(1) : 0,
      total: stats ? Number(stats.total) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
