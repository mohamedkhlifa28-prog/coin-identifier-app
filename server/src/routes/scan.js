'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/database');
const claude = require('../services/claude');
const { awardXP } = require('../utils/xp');
const { awardBadge } = require('../utils/badges');

const router = express.Router();

// Helper: check and update monthly scan count
function checkAndUpdateScanCount(user) {
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  let scanCount = user.scan_count_month || 0;
  const scanMonth = user.scan_month;

  // Reset if new month
  if (scanMonth !== currentMonth) {
    scanCount = 0;
    db.prepare('UPDATE users SET scan_count_month = 0, scan_month = ? WHERE id = ?')
      .run(currentMonth, user.id);
  }

  return { scanCount, currentMonth };
}

// POST /api/scan
router.post('/', authMiddleware, async (req, res) => {
  // Accept both { imageBase64, mimeType } and { image } formats
  const imageBase64 = req.body.imageBase64 || req.body.image;
  const mimeType = req.body.mimeType || 'image/jpeg';

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 (or image) is required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const { scanCount, currentMonth } = checkAndUpdateScanCount(user);

  // Free tier: max 10 scans/month
  const FREE_TIER_LIMIT = 10;
  if (user.subscription_tier === 'free' && scanCount >= FREE_TIER_LIMIT) {
    return res.status(402).json({
      error: 'Monthly scan limit reached',
      paywallReason: `Free tier allows ${FREE_TIER_LIMIT} scans per month. Upgrade to Pro for unlimited scans.`,
      scansUsed: scanCount,
      scansLimit: FREE_TIER_LIMIT,
    });
  }

  try {
    const result = await claude.identifyCoin(imageBase64, mimeType);

    // Save scan to DB
    const scanId = uuidv4();
    db.prepare(`
      INSERT INTO scans (id, user_id, result, confidence)
      VALUES (?, ?, ?, ?)
    `).run(scanId, user.id, JSON.stringify(result), result.confidenceScore || 0);

    // Award +10 XP
    const xpResult = awardXP(db, user.id, 10, 'coin_scan');

    // Badge: first scan
    const io = req.app.get('io');
    awardBadge(db, user.id, 'scan_1', io);

    // Update scan count
    db.prepare('UPDATE users SET scan_count_month = ?, scan_month = ? WHERE id = ?')
      .run(scanCount + 1, currentMonth, user.id);

    return res.json({
      scanId,
      result,
      xpAwarded: 10,
      newXP: xpResult.newXP,
      level: xpResult.level,
      scansUsed: scanCount + 1,
    });
  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Failed to process scan', details: err.message });
  }
});

// POST /api/scan/grade (Pro+ only)
router.post('/grade', authMiddleware, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.subscription_tier === 'free') {
    return res.status(402).json({
      error: 'Pro subscription required',
      paywallReason: 'AI coin grading is available on Pro and Expert tiers.',
    });
  }

  const { obverseBase64, reverseBase64, mimeType } = req.body;
  if (!obverseBase64 || !reverseBase64 || !mimeType) {
    return res.status(400).json({ error: 'obverseBase64, reverseBase64, and mimeType are required' });
  }

  try {
    const result = await claude.gradeCoin(obverseBase64, reverseBase64, mimeType);
    return res.json({ result });
  } catch (err) {
    console.error('Grade error:', err);
    return res.status(500).json({ error: 'Failed to grade coin', details: err.message });
  }
});

// POST /api/scan/error-detect (Pro+ only)
router.post('/error-detect', authMiddleware, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.subscription_tier === 'free') {
    return res.status(402).json({
      error: 'Pro subscription required',
      paywallReason: 'Error detection is available on Pro and Expert tiers.',
    });
  }

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
  }

  try {
    const result = await claude.detectErrors(imageBase64, mimeType);
    return res.json({ result });
  } catch (err) {
    console.error('Error detect error:', err);
    return res.status(500).json({ error: 'Failed to detect errors', details: err.message });
  }
});

module.exports = router;
