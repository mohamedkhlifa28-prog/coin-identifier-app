'use strict';

const express = require('express');

const router = express.Router();

// Mock price data generator based on grade
function generatePricesByGrade(baseValue) {
  const multipliers = {
    poor: 0.1,
    good: 0.2,
    veryGood: 0.3,
    fine: 0.5,
    veryFine: 0.8,
    extremelyFine: 1.0,
    aboutUncirculated: 1.5,
    ms60: 2.0,
    ms62: 2.5,
    ms63: 3.0,
    ms64: 4.5,
    ms65: 7.0,
    ms66: 12.0,
    ms67: 25.0,
    pf63: 4.0,
    pf65: 8.0,
  };

  const prices = {};
  for (const [grade, multiplier] of Object.entries(multipliers)) {
    prices[grade] = Math.round(baseValue * multiplier * 100) / 100;
  }
  return prices;
}

// Mock market trend data
function generateMarketTrend() {
  const trend = [];
  const now = Date.now();
  let price = 100 + Math.random() * 50;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    price += (Math.random() - 0.48) * 5; // slight upward drift
    if (price < 10) price = 10;
    trend.push({ date, price: Math.round(price * 100) / 100 });
  }

  return trend;
}

// GET /api/prices/silver/spot (must be before /:coinId)
router.get('/silver/spot', (req, res) => {
  // Simulate slight daily variation around $28.50/oz
  const base = 28.50;
  const variation = (Math.random() - 0.5) * 0.40;
  const spot = Math.round((base + variation) * 100) / 100;

  return res.json({
    metal: 'silver',
    price: spot,
    currency: 'USD',
    unit: 'troy oz',
    timestamp: new Date().toISOString(),
    change24h: Math.round(variation * 100) / 100,
    change24hPercent: Math.round((variation / base) * 10000) / 100,
  });
});

// GET /api/prices/gold/spot
router.get('/gold/spot', (req, res) => {
  const base = 2350.00;
  const variation = (Math.random() - 0.5) * 20;
  const spot = Math.round((base + variation) * 100) / 100;

  return res.json({
    metal: 'gold',
    price: spot,
    currency: 'USD',
    unit: 'troy oz',
    timestamp: new Date().toISOString(),
    change24h: Math.round(variation * 100) / 100,
    change24hPercent: Math.round((variation / base) * 10000) / 100,
  });
});

// GET /api/prices/:coinId
router.get('/:coinId', (req, res) => {
  const { coinId } = req.params;

  // Look up coin in DB to get base value info
  const db = require('../db/database');
  const coin = db.prepare('SELECT * FROM coins WHERE id = ?').get(coinId);

  if (!coin) {
    // Return mock data for unknown coins
    const mockBase = 25;
    return res.json({
      coinId,
      coinName: 'Unknown Coin',
      prices: generatePricesByGrade(mockBase),
      trend: generateMarketTrend(),
      lastUpdated: new Date().toISOString(),
      source: 'mock',
    });
  }

  // Estimate a base value from rarity tier
  const rarityBaseValues = {
    'Common': 5,
    'Uncommon': 25,
    'Rare': 150,
    'Very Rare': 500,
    'Ultra Rare': 5000,
  };

  const baseValue = rarityBaseValues[coin.rarity_tier] || 10;

  return res.json({
    coinId,
    coinName: coin.name,
    country: coin.country,
    year: coin.year,
    denomination: coin.denomination,
    composition: coin.composition,
    rarityTier: coin.rarity_tier,
    prices: generatePricesByGrade(baseValue),
    trend: generateMarketTrend(),
    lastUpdated: new Date().toISOString(),
    source: 'mock',
    note: 'Prices are estimates for reference purposes. Actual values may vary significantly.',
  });
});

module.exports = router;
