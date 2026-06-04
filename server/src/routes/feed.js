'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const db = require('../db/database');
const { awardXP } = require('../utils/xp');
const { awardBadge } = require('../utils/badges');

const router = express.Router();

// GET /api/feed/trending (before /:id)
router.get('/trending', optionalAuth, (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const posts = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar as author_avatar, u.level as author_level
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.created_at >= ?
    ORDER BY p.likes DESC
    LIMIT 10
  `).all(sevenDaysAgo);

  const userId = req.user ? req.user.id : null;

  const parsed = posts.map(post => {
    const likedByUser = userId
      ? !!db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, userId)
      : false;
    return {
      ...post,
      coin_data: JSON.parse(post.coin_data || '{}'),
      likedByUser,
    };
  });

  return res.json({ posts: parsed });
});

// GET /api/feed/weekly-challenge (before /:id)
router.get('/weekly-challenge', (req, res) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)

  return res.json({
    challenge: {
      id: 'weekly-001',
      title: 'Best Morgan Dollar Find This Week',
      description: 'Share your best Morgan dollar acquisition, CRH find, or collection piece. Best photo and story wins!',
      theme: 'Morgan Dollars',
      startDate: weekStart.toISOString().slice(0, 10),
      endDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      prize: '500 XP + Exclusive Badge',
      participants: 47,
      submissions: db.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'showcase' AND created_at >= ?")
        .get(weekStart.toISOString()).count,
    },
  });
});

// GET /api/feed
router.get('/', optionalAuth, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 50);
  const offset = (pageNum - 1) * limitNum;

  const { total } = db.prepare('SELECT COUNT(*) as total FROM posts').get();

  const posts = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar as author_avatar, u.level as author_level
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limitNum, offset);

  const userId = req.user ? req.user.id : null;

  const parsed = posts.map(post => {
    const likedByUser = userId
      ? !!db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, userId)
      : false;
    return {
      ...post,
      coin_data: JSON.parse(post.coin_data || '{}'),
      likedByUser,
    };
  });

  return res.json({
    posts: parsed,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// POST /api/feed
router.post('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { type, content, coin_data, image_url, estimated_value } = req.body;

  if (!content && !image_url) {
    return res.status(400).json({ error: 'Post must have content or an image' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO posts (id, user_id, type, content, coin_data, image_url, estimated_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, type || 'showcase', content || null,
    JSON.stringify(coin_data || {}), image_url || null,
    estimated_value || null
  );

  const xpResult = awardXP(db, userId, 15, 'create_post');

  // Badge: first post
  const io = req.app.get('io');
  awardBadge(db, userId, 'post_1', io);

  const post = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar as author_avatar, u.level as author_level
    FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
  `).get(id);

  return res.status(201).json({
    post: { ...post, coin_data: JSON.parse(post.coin_data || '{}'), likedByUser: false },
    xpAwarded: 15,
    newXP: xpResult.newXP,
    level: xpResult.level,
  });
});

// GET /api/feed/:id
router.get('/:id', optionalAuth, (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.name as author_name, u.avatar as author_avatar, u.level as author_level
    FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?
  `).get(req.params.id);

  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const comments = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);

  const userId = req.user ? req.user.id : null;
  const likedByUser = userId
    ? !!db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(post.id, userId)
    : false;

  return res.json({
    ...post,
    coin_data: JSON.parse(post.coin_data || '{}'),
    likedByUser,
    comments,
  });
});

// POST /api/feed/:id/like
router.post('/:id/like', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const postId = req.params.id;

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?')
    .get(postId, userId);

  let liked;
  if (existing) {
    // Unlike
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, userId);
    db.prepare('UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?').run(postId);
    liked = false;
  } else {
    // Like
    db.prepare('INSERT INTO likes (id, post_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), postId, userId);
    db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(postId);
    liked = true;
  }

  const updated = db.prepare('SELECT likes FROM posts WHERE id = ?').get(postId);
  return res.json({ liked, likes: updated.likes });
});

// POST /api/feed/:id/comment
router.post('/:id/comment', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const postId = req.params.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)')
    .run(id, postId, userId, content.trim());

  db.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').run(postId);

  const comment = db.prepare(`
    SELECT c.*, u.name as author_name, u.avatar as author_avatar
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(id);

  return res.status(201).json({ comment });
});

module.exports = router;
