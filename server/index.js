const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

async function start() {
  await initDb();

  const menuRoutes = require('./routes/menu');
  const orderRoutes = require('./routes/orders');
  const ownerRoutes = require('./routes/owner');
  const qrRoutes = require('./routes/qr');
  const authRoutes = require('./routes/auth');
  const feedbackRoutes = require('./routes/feedback');
  const { requireAuth } = require('./auth');

  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/feedback', feedbackRoutes);
  // Owner management endpoints require a logged-in owner
  app.use('/api/owner', requireAuth, ownerRoutes);
  app.use('/api/qr', qrRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve Angular app
  const clientPath = path.join(__dirname, '../client/dist/client/browser');
  app.use(express.static(clientPath, { maxAge: '1d' }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cafe server running on http://localhost:${PORT}`);
    console.log(`Customer menu: http://localhost:${PORT}/order`);
    console.log(`Owner portal:  http://localhost:${PORT}/owner`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
