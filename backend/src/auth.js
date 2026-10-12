const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'chill_night_secret_key_2026_super_secure';

function authenticateOwner(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid Authorization header format' });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    req.owner = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

function loginHandler(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const owner = db.prepare('SELECT * FROM owners WHERE username = ?').get(username);
  if (!owner) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const passwordMatch = bcrypt.compareSync(password, owner.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: owner.id, username: owner.username, role: 'owner' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.json({
    token,
    owner: {
      id: owner.id,
      username: owner.username,
      restaurantName: owner.restaurant_name,
      phone: owner.phone,
      address: owner.address,
    },
  });
}

module.exports = {
  JWT_SECRET,
  authenticateOwner,
  loginHandler,
};
