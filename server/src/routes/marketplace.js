'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const db = require('../db/database');

const router = express.Router();

// GET /api/marketplace/watchlist (before /:id)
router.get('/watchlist', authMiddleware, (req, res) => {
  const userId = req.user.id;

  const watchlistItems = db.prepare(`
    SELECT w.id as watchlist_id, w.created_at as watched_at,
           l.*, u.name as seller_name, u.email as seller_email
    FROM watchlist w
    JOIN listings l ON w.listing_id = l.id
    JOIN users u ON l.seller_id = u.id
    WHERE w.user_id = ? AND l.status = 'active'
    ORDER BY w.created_at DESC
  `).all(userId);

  const parsed = watchlistItems.map(item => ({
    ...item,
    images: JSON.parse(item.images || '[]'),
    coin_data: JSON.parse(item.coin_data || '{}'),
  }));

  return res.json({ watchlist: parsed });
});

// GET /api/marketplace
router.get('/', optionalAuth, (req, res) => {
  const { denomination, country, grade, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT l.*, u.name as seller_name, u.email as seller_email
    FROM listings l
    JOIN users u ON l.seller_id = u.id
    WHERE l.status = 'active'
  `;
  const params = [];

  if (denomination) {
    query += ' AND l.coin_data LIKE ?';
    params.push(`%${denomination}%`);
  }
  if (grade) {
    query += ' AND l.grade = ?';
    params.push(grade);
  }
  if (minPrice) {
    query += ' AND l.price >= ?';
    params.push(parseFloat(minPrice));
  }
  if (maxPrice) {
    query += ' AND l.price <= ?';
    params.push(parseFloat(maxPrice));
  }
  if (search) {
    query += ' AND (l.title LIKE ? OR l.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY l.created_at DESC';

  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);
  const offset = (pageNum - 1) * limitNum;

  // Count total
  const countQuery = query.replace(
    'SELECT l.*, u.name as seller_name, u.email as seller_email',
    'SELECT COUNT(*) as total'
  ).replace('ORDER BY l.created_at DESC', '');
  const { total } = db.prepare(countQuery).get(...params);

  query += ' LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const listings = db.prepare(query).all(...params);

  const parsed = listings.map(l => ({
    ...l,
    images: JSON.parse(l.images || '[]'),
    coin_data: JSON.parse(l.coin_data || '{}'),
  }));

  return res.json({
    listings: parsed,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// POST /api/marketplace
router.post('/', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { user_coin_id, title, description, price, grade, condition, image_url, images, coin_data } = req.body;

  if (!title || !price) {
    return res.status(400).json({ error: 'Title and price are required' });
  }

  let finalCoinData = coin_data || {};
  let finalGrade = grade;
  let finalCondition = condition;
  let finalImageUrl = image_url;

  // Auto-populate from user_coin if provided
  if (user_coin_id) {
    const userCoin = db.prepare('SELECT * FROM user_coins WHERE id = ? AND user_id = ?')
      .get(user_coin_id, userId);
    if (userCoin) {
      finalCoinData = {
        name: userCoin.name,
        country: userCoin.country,
        year: userCoin.year,
        denomination: userCoin.denomination,
        rarity_tier: userCoin.rarity_tier,
        ...finalCoinData,
      };
      finalGrade = finalGrade || userCoin.grade;
      finalCondition = finalCondition || userCoin.condition;
      finalImageUrl = finalImageUrl || userCoin.image_url;
    }
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO listings (id, seller_id, user_coin_id, title, description, price, grade, condition, image_url, images, coin_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, user_coin_id || null, title, description || null,
    parseFloat(price), finalGrade || null, finalCondition || null,
    finalImageUrl || null, JSON.stringify(images || []), JSON.stringify(finalCoinData)
  );

  const listing = db.prepare(`
    SELECT l.*, u.name as seller_name FROM listings l
    JOIN users u ON l.seller_id = u.id WHERE l.id = ?
  `).get(id);

  return res.status(201).json({
    ...listing,
    images: JSON.parse(listing.images || '[]'),
    coin_data: JSON.parse(listing.coin_data || '{}'),
  });
});

// GET /api/marketplace/:id
router.get('/:id', optionalAuth, (req, res) => {
  const listing = db.prepare(`
    SELECT l.*, u.name as seller_name, u.email as seller_email,
           u.xp as seller_xp, u.level as seller_level
    FROM listings l
    JOIN users u ON l.seller_id = u.id
    WHERE l.id = ?
  `).get(req.params.id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  // Increment views (only if not the seller)
  if (!req.user || req.user.id !== listing.seller_id) {
    db.prepare('UPDATE listings SET views = views + 1 WHERE id = ?').run(req.params.id);
    listing.views = listing.views + 1;
  }

  // Get offer count
  const offerCount = db.prepare('SELECT COUNT(*) as count FROM offers WHERE listing_id = ? AND status = ?')
    .get(req.params.id, 'pending');

  // Include full offers when requester is the seller
  let offers = [];
  if (req.user && req.user.id === listing.seller_id) {
    offers = db.prepare(`
      SELECT o.*, u.name as buyer_name
      FROM offers o JOIN users u ON o.buyer_id = u.id
      WHERE o.listing_id = ? ORDER BY o.created_at DESC
    `).all(req.params.id);
  }

  return res.json({
    ...listing,
    images: JSON.parse(listing.images || '[]'),
    coin_data: JSON.parse(listing.coin_data || '{}'),
    offerCount: offerCount.count,
    offers,
  });
});

// PUT /api/marketplace/:id
router.put('/:id', authMiddleware, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  if (listing.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { title, description, price, grade, condition, image_url, images, coin_data, status } = req.body;

  db.prepare(`
    UPDATE listings SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      grade = COALESCE(?, grade),
      condition = COALESCE(?, condition),
      image_url = COALESCE(?, image_url),
      images = COALESCE(?, images),
      coin_data = COALESCE(?, coin_data),
      status = COALESCE(?, status)
    WHERE id = ? AND seller_id = ?
  `).run(
    title || null, description || null, price ? parseFloat(price) : null,
    grade || null, condition || null, image_url || null,
    images ? JSON.stringify(images) : null,
    coin_data ? JSON.stringify(coin_data) : null,
    status || null,
    req.params.id, req.user.id
  );

  const updated = db.prepare(`
    SELECT l.*, u.name as seller_name FROM listings l
    JOIN users u ON l.seller_id = u.id WHERE l.id = ?
  `).get(req.params.id);

  return res.json({
    ...updated,
    images: JSON.parse(updated.images || '[]'),
    coin_data: JSON.parse(updated.coin_data || '{}'),
  });
});

// DELETE /api/marketplace/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  if (listing.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  db.prepare("UPDATE listings SET status = 'deleted' WHERE id = ?").run(req.params.id);

  return res.json({ message: 'Listing deleted successfully' });
});

// POST /api/marketplace/:id/offer
router.post('/:id/offer', authMiddleware, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ? AND status = ?')
    .get(req.params.id, 'active');

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found or not active' });
  }

  if (listing.seller_id === req.user.id) {
    return res.status(400).json({ error: 'Cannot make an offer on your own listing' });
  }

  const { amount, message } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid offer amount is required' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO offers (id, listing_id, buyer_id, amount, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.params.id, req.user.id, parseFloat(amount), message || null);

  // Create notification for seller
  const buyer = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  const notifId = uuidv4();
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (?, ?, 'offer', ?, ?, ?)
  `).run(
    notifId, listing.seller_id,
    'New Offer Received',
    `${buyer ? buyer.name : 'Someone'} made an offer of $${parseFloat(amount).toFixed(2)} on "${listing.title}"`,
    JSON.stringify({ listing_id: listing.id, offer_id: id, amount })
  );

  const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
  return res.status(201).json({ offer });
});

// PUT /api/marketplace/:id/offer/:offerId
router.put('/:id/offer/:offerId', authMiddleware, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  if (listing.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the seller can respond to offers' });
  }

  const offer = db.prepare('SELECT * FROM offers WHERE id = ? AND listing_id = ?')
    .get(req.params.offerId, req.params.id);

  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  const { status, counterAmount } = req.body;
  const validStatuses = ['accepted', 'declined', 'counter'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted, declined, or counter' });
  }

  db.prepare('UPDATE offers SET status = ? WHERE id = ?').run(status, offer.id);

  // Notify buyer
  const notifId = uuidv4();
  let notifMessage;
  if (status === 'accepted') {
    notifMessage = `Your offer of $${offer.amount.toFixed(2)} on "${listing.title}" was accepted!`;
  } else if (status === 'declined') {
    notifMessage = `Your offer of $${offer.amount.toFixed(2)} on "${listing.title}" was declined.`;
  } else {
    notifMessage = `The seller countered your offer on "${listing.title}" with $${parseFloat(counterAmount || 0).toFixed(2)}.`;
  }

  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (?, ?, 'offer_response', ?, ?, ?)
  `).run(
    notifId, offer.buyer_id, 'Offer Update', notifMessage,
    JSON.stringify({ listing_id: listing.id, offer_id: offer.id, status, counterAmount })
  );

  const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(offer.id);
  return res.json({ offer: updated });
});

// POST /api/marketplace/:id/watch
router.post('/:id/watch', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const listingId = req.params.id;

  const listing = db.prepare('SELECT id FROM listings WHERE id = ?').get(listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const existing = db.prepare('SELECT id FROM watchlist WHERE user_id = ? AND listing_id = ?')
    .get(userId, listingId);

  if (existing) {
    // Toggle off
    db.prepare('DELETE FROM watchlist WHERE user_id = ? AND listing_id = ?').run(userId, listingId);
    return res.json({ watching: false, message: 'Removed from watchlist' });
  } else {
    // Toggle on
    db.prepare('INSERT INTO watchlist (id, user_id, listing_id) VALUES (?, ?, ?)')
      .run(uuidv4(), userId, listingId);
    return res.json({ watching: true, message: 'Added to watchlist' });
  }
});

module.exports = router;
