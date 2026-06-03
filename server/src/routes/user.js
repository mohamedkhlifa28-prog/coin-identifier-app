'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/database');

const router = express.Router();

// GET /api/user/profile
router.get('/profile', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password_hash, ...safeUser } = user;

  // Collection stats
  const collectionStats = db.prepare(`
    SELECT COUNT(*) as count, SUM(estimated_value) as total_value
    FROM user_coins WHERE user_id = ?
  `).get(req.user.id);

  // Scan count
  const scanStats = db.prepare(
    'SELECT COUNT(*) as count FROM scans WHERE user_id = ?'
  ).get(req.user.id);

  // Post count
  const postStats = db.prepare(
    'SELECT COUNT(*) as count FROM posts WHERE user_id = ?'
  ).get(req.user.id);

  // Badges
  const badges = db.prepare(`
    SELECT b.*, ub.earned_at
    FROM user_badges ub
    JOIN badges b ON ub.badge_id = b.id
    WHERE ub.user_id = ?
    ORDER BY ub.earned_at DESC
  `).all(req.user.id);

  return res.json({
    ...safeUser,
    stats: {
      totalCoins: collectionStats.count,
      totalValue: Math.round((collectionStats.total_value || 0) * 100) / 100,
      totalScans: scanStats.count,
      totalPosts: postStats.count,
    },
    badges,
  });
});

// GET /api/user/stats
router.get('/stats', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const badges = db.prepare(`
    SELECT b.*, ub.earned_at
    FROM user_badges ub
    JOIN badges b ON ub.badge_id = b.id
    WHERE ub.user_id = ?
  `).all(req.user.id);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const scanCountThisMonth = user.scan_month === currentMonth ? (user.scan_count_month || 0) : 0;

  const totalCoins = db.prepare('SELECT COUNT(*) as count FROM user_coins WHERE user_id = ?').get(req.user.id).count;
  const totalScans = db.prepare('SELECT COUNT(*) as count FROM scans WHERE user_id = ?').get(req.user.id).count;
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(req.user.id).count;

  return res.json({
    xp: user.xp,
    level: user.level,
    streak: user.streak,
    scanCountThisMonth,
    badges,
    subscriptionTier: user.subscription_tier,
    totalCoins,
    totalScans,
    totalPosts,
  });
});

// GET /api/leaderboard
router.get('/leaderboard', (req, res) => {
  const leaders = db.prepare(`
    SELECT id, name, avatar, xp, level, streak,
           (SELECT COUNT(*) FROM user_coins WHERE user_id = users.id) as coin_count
    FROM users
    ORDER BY xp DESC
    LIMIT 10
  `).all();

  return res.json({ leaderboard: leaders });
});

// PUT /api/user/profile
router.put('/profile', authMiddleware, (req, res) => {
  const { name, avatar } = req.body;

  if (!name && !avatar) {
    return res.status(400).json({ error: 'At least name or avatar must be provided' });
  }

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      avatar = COALESCE(?, avatar)
    WHERE id = ?
  `).run(name || null, avatar || null, req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const { password_hash, ...safeUser } = user;
  return res.json(safeUser);
});

// GET /api/user/notifications
router.get('/notifications', authMiddleware, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50);
  const offset = (pageNum - 1) * limitNum;

  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, limitNum, offset);

  const { total } = db.prepare('SELECT COUNT(*) as total FROM notifications WHERE user_id = ?')
    .get(req.user.id);

  const { unread } = db.prepare('SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND read = 0')
    .get(req.user.id);

  const parsed = notifications.map(n => ({
    ...n,
    data: JSON.parse(n.data || '{}'),
    read: n.read === 1,
  }));

  return res.json({
    notifications: parsed,
    unread,
    pagination: { page: pageNum, limit: limitNum, total },
  });
});

// PUT /api/user/notifications/:id/read
router.put('/notifications/:id/read', authMiddleware, (req, res) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  return res.json({ message: 'Notification marked as read' });
});

// PUT /api/user/notifications/read-all
router.put('/notifications/read-all', authMiddleware, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  return res.json({ message: 'All notifications marked as read' });
});

// GET /api/user/badges
router.get('/badges', authMiddleware, (req, res) => {
  const earned = db.prepare(`
    SELECT b.*, ub.earned_at
    FROM user_badges ub
    JOIN badges b ON ub.badge_id = b.id
    WHERE ub.user_id = ?
    ORDER BY ub.earned_at DESC
  `).all(req.user.id);

  const allBadges = db.prepare('SELECT * FROM badges').all();

  const earnedIds = new Set(earned.map(b => b.id));
  const available = allBadges.filter(b => !earnedIds.has(b.id));

  return res.json({ earned, available });
});

module.exports = router;
