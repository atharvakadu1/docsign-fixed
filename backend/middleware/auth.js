// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // Allow token via query param for direct browser requests (e.g. PDF view in <object> tag)
    const header = req.headers.authorization;
    const queryToken = req.query.token;
    let token;

    if (header?.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    } else if (queryToken) {
      token = queryToken;
    } else {
      return res.status(401).json({ error: 'No token provided. Please log in.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    if (!user.isActive) return res.status(403).json({ error: 'Account has been deactivated.' });
    if (user.isLocked()) return res.status(403).json({ error: 'Account is temporarily locked.' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
  }
  next();
};

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// Get client info from request
const getClientInfo = (req) => ({
  ip:        req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
});

module.exports = { protect, requireRole, generateToken, getClientInfo };
