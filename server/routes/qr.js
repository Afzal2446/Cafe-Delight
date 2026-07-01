const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

// Generate QR code for the ordering page
router.get('/generate', async (req, res) => {
  const { table } = req.query;
  const baseUrl = req.query.url || `${req.protocol}://${req.get('host')}`;
  const orderUrl = table ? `${baseUrl}/order?table=${table}` : `${baseUrl}/order`;

  try {
    const qrDataUrl = await QRCode.toDataURL(orderUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
    res.json({ qr: qrDataUrl, url: orderUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
