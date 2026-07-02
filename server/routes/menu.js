const express = require('express');
const router = express.Router();
const { queryAll } = require('../db');

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await queryAll('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all menu items (optionally filter by category)
router.get('/items', async (req, res) => {
  const { category_id } = req.query;
  try {
    let items;
    if (category_id) {
      items = await queryAll(`
        SELECT m.*, c.name as category_name
        FROM menu_items m JOIN categories c ON m.category_id = c.id
        WHERE m.category_id = ? AND m.is_available = 1
        ORDER BY m.name
      `, [Number(category_id)]);
    } else {
      items = await queryAll(`
        SELECT m.*, c.name as category_name
        FROM menu_items m JOIN categories c ON m.category_id = c.id
        WHERE m.is_available = 1
        ORDER BY c.name, m.name
      `);
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all items including unavailable (for owner)
router.get('/items/all', async (req, res) => {
  try {
    const items = await queryAll(`
      SELECT m.*, c.name as category_name
      FROM menu_items m JOIN categories c ON m.category_id = c.id
      ORDER BY c.name, m.name
    `);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
