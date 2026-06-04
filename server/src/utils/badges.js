'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Awards a badge to a user if they haven't already earned it.
 * Creates a notification and emits a socket event.
 * @returns {object|null} the badge if newly awarded, null otherwise
 */
function awardBadge(db, userId, requirement, io) {
  try {
    const badge = db.prepare('SELECT * FROM badges WHERE requirement = ?').get(requirement);
    if (!badge) return null;

    const existing = db.prepare('SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?').get(userId, badge.id);
    if (existing) return null;

    db.prepare('INSERT OR IGNORE INTO user_badges (id, user_id, badge_id) VALUES (?, ?, ?)')
      .run(uuidv4(), userId, badge.id);

    const notifId = uuidv4();
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, data) VALUES (?, ?, 'badge', ?, ?, ?)`)
      .run(
        notifId, userId,
        `${badge.icon || '🏅'} Badge Earned!`,
        `You earned the "${badge.name}" badge: ${badge.description}`,
        JSON.stringify({ badge_id: badge.id, badge_name: badge.name, badge_icon: badge.icon })
      );

    if (io) {
      io.to(`user:${userId}`).emit('notification', {
        type: 'badge',
        title: `${badge.icon || '🏅'} Badge Earned!`,
        message: `You earned the "${badge.name}" badge!`,
        badge,
      });
    }

    return badge;
  } catch (err) {
    console.error('Badge award error:', err.message);
    return null;
  }
}

module.exports = { awardBadge };
