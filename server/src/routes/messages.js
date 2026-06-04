'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/database');

const router = express.Router();

// GET /api/messages/conversations
router.get('/conversations', authMiddleware, (req, res) => {
  const userId = req.user.id;

  const conversations = db.prepare(`
    SELECT
      CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
      u.name AS other_user_name,
      m.content AS last_message,
      m.created_at AS last_message_at,
      m.sender_id AS last_sender_id,
      SUM(CASE WHEN m.receiver_id = ? AND m.read = 0 THEN 1 ELSE 0 END) AS unread_count
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
    WHERE m.sender_id = ? OR m.receiver_id = ?
    GROUP BY other_user_id
    ORDER BY last_message_at DESC
  `).all(userId, userId, userId, userId, userId);

  return res.json({ conversations });
});

// GET /api/messages/:userId
router.get('/:userId', authMiddleware, (req, res) => {
  const me = req.user.id;
  const other = req.params.userId;

  const otherUser = db.prepare('SELECT id, name, level FROM users WHERE id = ?').get(other);
  if (!otherUser) return res.status(404).json({ error: 'User not found' });

  const messages = db.prepare(`
    SELECT m.*, u.name AS sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(me, other, other, me);

  // Mark received messages as read
  db.prepare('UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0')
    .run(other, me);

  return res.json({ messages, otherUser });
});

// POST /api/messages/:userId
router.post('/:userId', authMiddleware, (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.userId;

  if (senderId === receiverId) {
    return res.status(400).json({ error: 'Cannot message yourself' });
  }

  const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(receiverId);
  if (!receiver) return res.status(404).json({ error: 'User not found' });

  const { content, listingId } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO messages (id, sender_id, receiver_id, listing_id, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, senderId, receiverId, listingId || null, content.trim());

  const message = db.prepare(`
    SELECT m.*, u.name AS sender_name FROM messages m
    JOIN users u ON u.id = m.sender_id WHERE m.id = ?
  `).get(id);

  // Notify receiver via socket
  const io = req.app.get('io');
  if (io) {
    const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(senderId);
    io.to(`user:${receiverId}`).emit('new_message', {
      senderId,
      senderName: sender?.name,
      messagePreview: content.trim().slice(0, 60),
    });
  }

  return res.status(201).json({ message });
});

// PUT /api/messages/:userId/read
router.put('/:userId/read', authMiddleware, (req, res) => {
  const me = req.user.id;
  const other = req.params.userId;

  db.prepare('UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0')
    .run(other, me);

  return res.json({ ok: true });
});

module.exports = router;
