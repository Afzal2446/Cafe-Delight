const express = require('express');
const router = express.Router();
const { queryOne, execute } = require('../db');
const { hashPassword, verifyPassword, signToken, requireAuth } = require('../auth');

// Register a new owner
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await queryOne('SELECT id FROM owners WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const { salt, hash } = hashPassword(password);
    await execute('INSERT INTO owners (name, email, password_hash, salt) VALUES (?, ?, ?, ?)',
      [name || null, normalizedEmail, hash, salt]);

    const owner = await queryOne('SELECT id, name, email FROM owners WHERE email = ?', [normalizedEmail]);
    const token = signToken({ sub: owner.id, email: owner.email });
    res.status(201).json({ token, owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const owner = await queryOne('SELECT * FROM owners WHERE email = ?', [normalizedEmail]);
    if (!owner || !verifyPassword(password, owner.salt, owner.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ sub: owner.id, email: owner.email });
    res.json({ token, owner: { id: owner.id, name: owner.name, email: owner.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Current owner (validate token)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const owner = await queryOne('SELECT id, name, email FROM owners WHERE id = ?', [req.owner.sub]);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });
    res.json({ owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
