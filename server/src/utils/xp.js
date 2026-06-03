'use strict';

/**
 * Returns a level name based on XP thresholds.
 * @param {number} xp
 * @returns {string}
 */
function calculateLevel(xp) {
  if (xp >= 5000) return 'Master Numismatist';
  if (xp >= 2000) return 'Expert';
  if (xp >= 500)  return 'Collector';
  if (xp >= 100)  return 'Apprentice';
  return 'Novice';
}

/**
 * Awards XP to a user, recalculates their level, and persists the change.
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {number} amount
 * @param {string} [reason]
 * @returns {{ newXP: number, level: string }}
 */
function awardXP(db, userId, amount, reason) {
  const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const newXP   = (user.xp || 0) + amount;
  const level   = calculateLevel(newXP);

  db.prepare('UPDATE users SET xp = ?, level = ? WHERE id = ?').run(newXP, level, userId);

  return { newXP, level };
}

module.exports = { calculateLevel, awardXP };
