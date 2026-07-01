const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Get all categories
router.get('/categories', (req, res) => {
  const categories = queryAll('SELECT * FROM categories ORDER BY name');
  res.json(categories);
});

// Get all menu items (optionally filter by category)
router.get('/items', (req, res) => {
  const { category_id } = req.query;
  let items;
  if (category_id) {
    items = queryAll(`
      SELECT m.*, c.name as category_name 
      FROM menu_items m JOIN categories c ON m.category_id = c.id 
      WHERE m.category_id = ? AND m.is_available = 1 
      ORDER BY m.name
    `, [Number(category_id)]);
  } else {
    items = queryAll(`
      SELECT m.*, c.name as category_name 
      FROM menu_items m JOIN categories c ON m.category_id = c.id 
      WHERE m.is_available = 1 
      ORDER BY c.name, m.name
    `);
  }
  res.json(items);
});

// Get all items including unavailable (for owner)
router.get('/items/all', (req, res) => {
  const items = queryAll(`
    SELECT m.*, c.name as category_name 
    FROM menu_items m JOIN categories c ON m.category_id = c.id 
    ORDER BY c.name, m.name
  `);
  res.json(items);
});

module.exports = router;
