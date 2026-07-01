const crypto = require('crypto');

// Secret used to sign tokens. Set JWT_SECRET in production (Render env var).
const SECRET = process.env.JWT_SECRET || 'change-this-cafe-secret-in-production';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToString(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString();
}

// --- Password hashing (scrypt) ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// --- Token sign / verify ---
function signToken(payload) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const data = base64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || token.indexOf('.') === -1) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(base64urlToString(data));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Express middleware ---
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.owner = payload;
  next();
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, requireAuth };
