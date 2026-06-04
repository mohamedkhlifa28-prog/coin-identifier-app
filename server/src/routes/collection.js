'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const db = require('../db/database');
const { awardXP } = require('../utils/xp');
const { awardBadge } = require('../utils/badges');

const router = express.Router();

// GET /api/collection/stats  (must be before /:id)
router.get('/stats', authMiddleware, (req, res) => {
  const userId = req.user.id;

  const coins = db.prepare('SELECT * FROM user_coins WHERE user_id = ?').all(userId);

  const totalCoins = coins.length;
  const totalValue = coins.reduce((sum, c) => sum + (c.estimated_value || 0), 0);
  const costBasis = coins.reduce((sum, c) => sum + (c.purchase_price || 0), 0);

  const rarityBreakdown = {};
  for (const coin of coins) {
    const tier = coin.rarity_tier || 'Common';
    if (!rarityBreakdown[tier]) {
      rarityBreakdown[tier] = { count: 0, value: 0 };
    }
    rarityBreakdown[tier].count++;
    rarityBreakdown[tier].value += coin.estimated_value || 0;
  }

  const countryBreakdown = {};
  for (const coin of coins) {
    const country = coin.country || 'Unknown';
    countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
  }

  return res.json({
    totalCoins,
    totalValue: Math.round(totalValue * 100) / 100,
    costBasis: Math.round(costBasis * 100) / 100,
    unrealizedGain: Math.round((totalValue - costBasis) * 100) / 100,
    rarityBreakdown,
    countryBreakdown,
  });
});

// GET /api/collection
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { country, yearMin, yearMax, rarity, rarities, denomination, series, sortBy } = req.query;

  let query = 'SELECT * FROM user_coins WHERE user_id = ?';
  const params = [userId];

  if (country) {
    query += ' AND country = ?';
    params.push(country);
  }
  if (yearMin) {
    query += ' AND year >= ?';
    params.push(parseInt(yearMin, 10));
  }
  if (yearMax) {
    query += ' AND year <= ?';
    params.push(parseInt(yearMax, 10));
  }
  if (rarities) {
    const list = rarities.split(',').map(r => r.trim()).filter(Boolean);
    if (list.length === 1) {
      query += ' AND rarity_tier = ?';
      params.push(list[0]);
    } else if (list.length > 1) {
      query += ` AND rarity_tier IN (${list.map(() => '?').join(',')})`;
      params.push(...list);
    }
  } else if (rarity) {
    query += ' AND rarity_tier = ?';
    params.push(rarity);
  }
  if (denomination) {
    query += ' AND denomination = ?';
    params.push(denomination);
  }

  // Sort
  switch (sortBy) {
    case 'value_desc':
    case 'value':
      query += ' ORDER BY estimated_value DESC'; break;
    case 'value_asc':
      query += ' ORDER BY estimated_value ASC'; break;
    case 'year_asc':
    case 'year':
      query += ' ORDER BY year ASC'; break;
    case 'year_desc':
      query += ' ORDER BY year DESC'; break;
    case 'rarity': {
      const rarityOrder = "CASE rarity_tier WHEN 'Ultra Rare' THEN 1 WHEN 'Very Rare' THEN 2 WHEN 'Rare' THEN 3 WHEN 'Uncommon' THEN 4 ELSE 5 END";
      query += ` ORDER BY ${rarityOrder}`; break;
    }
    case 'date_asc':
      query += ' ORDER BY created_at ASC'; break;
    case 'date_desc':
    default:
      query += ' ORDER BY created_at DESC'; break;
  }

  const coins = db.prepare(query).all(...params);

  // Parse JSON fields
  const parsed = coins.map(c => ({
    ...c,
    images: JSON.parse(c.images || '[]'),
    ai_data: JSON.parse(c.ai_data || '{}'),
  }));

  return res.json({ coins: parsed, total: parsed.length });
});

// POST /api/collection
router.post('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const {
    coin_id, name, country, year, denomination, grade, condition,
    purchase_price, purchase_date, estimated_value, rarity_tier,
    notes, image_url, images, ai_data,
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Coin name is required' });
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO user_coins (
      id, user_id, coin_id, name, country, year, denomination, grade, condition,
      purchase_price, purchase_date, estimated_value, rarity_tier,
      notes, image_url, images, ai_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, coin_id || null, name, country || null, year || null,
    denomination || null, grade || null, condition || null,
    purchase_price || null, purchase_date || null, estimated_value || null,
    rarity_tier || 'Common', notes || null, image_url || null,
    JSON.stringify(images || []), JSON.stringify(ai_data || {})
  );

  const xpResult = awardXP(db, userId, 5, 'add_coin');
  const coin = db.prepare('SELECT * FROM user_coins WHERE id = ?').get(id);

  // Badge checks
  const io = req.app.get('io');
  const coinCount = db.prepare('SELECT COUNT(*) as cnt FROM user_coins WHERE user_id = ?').get(userId).cnt;
  if (coinCount >= 10) awardBadge(db, userId, 'collect_10', io);

  // Century Club: coin older than 100 years
  const currentYear = new Date().getFullYear();
  if (year && (currentYear - parseInt(year, 10)) >= 100) awardBadge(db, userId, 'old_coin', io);

  // Silver Tongue: own 5 silver coins (check by composition in ai_data or coin name)
  const silverCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM user_coins
    WHERE user_id = ? AND (
      LOWER(ai_data) LIKE '%silver%' OR LOWER(name) LIKE '%silver%'
    )
  `).get(userId).cnt;
  if (silverCount >= 5) awardBadge(db, userId, 'silver_5', io);

  return res.status(201).json({
    coin: { ...coin, images: JSON.parse(coin.images), ai_data: JSON.parse(coin.ai_data) },
    xpAwarded: 5,
    newXP: xpResult.newXP,
    level: xpResult.level,
  });
});

// GET /api/collection/:id
router.get('/:id', authMiddleware, (req, res) => {
  const coin = db.prepare('SELECT * FROM user_coins WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!coin) {
    return res.status(404).json({ error: 'Coin not found' });
  }

  return res.json({
    ...coin,
    images: JSON.parse(coin.images || '[]'),
    ai_data: JSON.parse(coin.ai_data || '{}'),
  });
});

// PUT /api/collection/:id
router.put('/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT * FROM user_coins WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: 'Coin not found' });
  }

  const {
    name, country, year, denomination, grade, condition,
    purchase_price, purchase_date, estimated_value, rarity_tier,
    notes, image_url, images, ai_data,
  } = req.body;

  db.prepare(`
    UPDATE user_coins SET
      name = COALESCE(?, name),
      country = COALESCE(?, country),
      year = COALESCE(?, year),
      denomination = COALESCE(?, denomination),
      grade = COALESCE(?, grade),
      condition = COALESCE(?, condition),
      purchase_price = COALESCE(?, purchase_price),
      purchase_date = COALESCE(?, purchase_date),
      estimated_value = COALESCE(?, estimated_value),
      rarity_tier = COALESCE(?, rarity_tier),
      notes = COALESCE(?, notes),
      image_url = COALESCE(?, image_url),
      images = COALESCE(?, images),
      ai_data = COALESCE(?, ai_data)
    WHERE id = ? AND user_id = ?
  `).run(
    name || null, country || null, year || null, denomination || null,
    grade || null, condition || null, purchase_price || null, purchase_date || null,
    estimated_value || null, rarity_tier || null, notes || null, image_url || null,
    images ? JSON.stringify(images) : null,
    ai_data ? JSON.stringify(ai_data) : null,
    req.params.id, req.user.id
  );

  const updated = db.prepare('SELECT * FROM user_coins WHERE id = ?').get(req.params.id);
  return res.json({
    ...updated,
    images: JSON.parse(updated.images || '[]'),
    ai_data: JSON.parse(updated.ai_data || '{}'),
  });
});

// DELETE /api/collection/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const existing = db.prepare('SELECT * FROM user_coins WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: 'Coin not found' });
  }

  db.prepare('DELETE FROM user_coins WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  return res.json({ message: 'Coin deleted successfully' });
});

module.exports = router;
