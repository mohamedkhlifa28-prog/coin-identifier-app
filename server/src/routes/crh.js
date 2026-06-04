'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/database');

const router = express.Router();

// GET /api/crh/stats
router.get('/stats', authMiddleware, (req, res) => {
  const userId = req.user.id;

  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total_sessions,
      SUM(rolls_searched) AS total_rolls,
      SUM(total_face_value) AS total_face_value,
      SUM(melt_value) AS total_melt_value
    FROM crh_sessions
    WHERE user_id = ?
  `).get(userId);

  const byDenomination = db.prepare(`
    SELECT denomination, COUNT(*) AS sessions, SUM(rolls_searched) AS rolls
    FROM crh_sessions
    WHERE user_id = ?
    GROUP BY denomination
    ORDER BY rolls DESC
  `).all(userId);

  return res.json({ stats: totals, byDenomination });
});

// GET /api/crh
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const sessions = db.prepare(`
    SELECT * FROM crh_sessions WHERE user_id = ? ORDER BY date DESC, created_at DESC
  `).all(userId);

  const parsed = sessions.map((s) => ({
    ...s,
    coins_found: JSON.parse(s.coins_found || '[]'),
  }));

  return res.json({ sessions: parsed });
});

// POST /api/crh
router.post('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { date, bank, denomination, rolls_searched, coins_found, total_face_value, melt_value, notes } = req.body;

  if (!denomination || !rolls_searched) {
    return res.status(400).json({ error: 'denomination and rolls_searched are required' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO crh_sessions (id, user_id, date, bank, denomination, rolls_searched, coins_found, total_face_value, melt_value, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId,
    date || new Date().toISOString().slice(0, 10),
    bank || null,
    denomination,
    parseInt(rolls_searched, 10) || 0,
    JSON.stringify(coins_found || []),
    parseFloat(total_face_value) || 0,
    parseFloat(melt_value) || 0,
    notes || null
  );

  const session = db.prepare('SELECT * FROM crh_sessions WHERE id = ?').get(id);
  return res.status(201).json({
    session: { ...session, coins_found: JSON.parse(session.coins_found || '[]') },
  });
});

// PUT /api/crh/:id
router.put('/:id', authMiddleware, (req, res) => {
  const session = db.prepare('SELECT * FROM crh_sessions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { date, bank, denomination, rolls_searched, coins_found, total_face_value, melt_value, notes } = req.body;

  db.prepare(`
    UPDATE crh_sessions SET
      date = COALESCE(?, date),
      bank = COALESCE(?, bank),
      denomination = COALESCE(?, denomination),
      rolls_searched = COALESCE(?, rolls_searched),
      coins_found = COALESCE(?, coins_found),
      total_face_value = COALESCE(?, total_face_value),
      melt_value = COALESCE(?, melt_value),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(
    date || null, bank || null, denomination || null,
    rolls_searched ? parseInt(rolls_searched, 10) : null,
    coins_found ? JSON.stringify(coins_found) : null,
    total_face_value != null ? parseFloat(total_face_value) : null,
    melt_value != null ? parseFloat(melt_value) : null,
    notes || null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM crh_sessions WHERE id = ?').get(req.params.id);
  return res.json({
    session: { ...updated, coins_found: JSON.parse(updated.coins_found || '[]') },
  });
});

// DELETE /api/crh/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const session = db.prepare('SELECT * FROM crh_sessions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  db.prepare('DELETE FROM crh_sessions WHERE id = ?').run(req.params.id);
  return res.json({ ok: true });
});

module.exports = router;
