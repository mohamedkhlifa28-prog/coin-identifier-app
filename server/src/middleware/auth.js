'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware that requires a valid JWT. Returns 401 if absent or invalid.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware that attaches the user if a valid token is present,
 * but does NOT fail the request if the token is absent or invalid.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
    } catch (_) {
      // ignore invalid tokens in optional auth
    }
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
