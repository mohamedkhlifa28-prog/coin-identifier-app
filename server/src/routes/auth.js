'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { awardXP } = require('../utils/xp');

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, last_login_date, streak)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(id, email.toLowerCase(), password_hash, name.trim(), today);

  // Award "First Step" badge
  const firstStepBadge = db.prepare("SELECT id FROM badges WHERE name = 'First Step'").get();
  if (firstStepBadge) {
    try {
      db.prepare('INSERT OR IGNORE INTO user_badges (id, user_id, badge_id) VALUES (?, ?, ?)')
        .run(uuidv4(), id, firstStepBadge.id);
    } catch (_) { /* already exists */ }
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = generateToken(user);

  return res.status(201).json({ token, user: sanitizeUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let newStreak = user.streak || 1;

  if (user.last_login_date === today) {
    // Already logged in today — keep streak unchanged
    newStreak = user.streak;
  } else if (user.last_login_date === yesterday) {
    // Consecutive day — increment streak
    newStreak = (user.streak || 0) + 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  // Award +5 XP for daily login (only if not already logged in today)
  let xpResult = { newXP: user.xp, level: user.level };
  if (user.last_login_date !== today) {
    xpResult = awardXP(db, user.id, 5, 'daily_login');
  }

  db.prepare('UPDATE users SET last_login_date = ?, streak = ? WHERE id = ?')
    .run(today, newStreak, user.id);

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const token = generateToken(updatedUser);

  return res.json({ token, user: sanitizeUser(updatedUser) });
});

module.exports = router;
