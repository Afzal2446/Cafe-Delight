const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');
const { hashPassword, verifyPassword, signToken, requireAuth } = require('../auth');

function queryOne(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function run(sql, params = []) {
  const db = getDb();
  db.run(sql, params);
  saveDb();
}

// Register a new owner
router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = queryOne('SELECT id FROM owners WHERE email = ?', [normalizedEmail]);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const { salt, hash } = hashPassword(password);
  run('INSERT INTO owners (name, email, password_hash, salt) VALUES (?, ?, ?, ?)',
    [name || null, normalizedEmail, hash, salt]);

  const owner = queryOne('SELECT id, name, email FROM owners WHERE email = ?', [normalizedEmail]);
  const token = signToken({ sub: owner.id, email: owner.email });
  res.status(201).json({ token, owner });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const owner = queryOne('SELECT * FROM owners WHERE email = ?', [normalizedEmail]);
  if (!owner || !verifyPassword(password, owner.salt, owner.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({ sub: owner.id, email: owner.email });
  res.json({ token, owner: { id: owner.id, name: owner.name, email: owner.email } });
});

// Current owner (validate token)
router.get('/me', requireAuth, (req, res) => {
  const owner = queryOne('SELECT id, name, email FROM owners WHERE id = ?', [req.owner.sub]);
  if (!owner) return res.status(404).json({ error: 'Owner not found' });
  res.json({ owner });
});

module.exports = router;
