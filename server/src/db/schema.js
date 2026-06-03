'use strict';

/**
 * Runs all CREATE TABLE IF NOT EXISTS statements against the given db instance.
 * @param {import('better-sqlite3').Database} db
 */
function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      xp INTEGER DEFAULT 0,
      level TEXT DEFAULT 'Novice',
      streak INTEGER DEFAULT 0,
      last_login_date TEXT,
      scan_count_month INTEGER DEFAULT 0,
      scan_month TEXT,
      subscription_tier TEXT DEFAULT 'free',
      subscription_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT,
      year INTEGER,
      denomination TEXT,
      mint_mark TEXT,
      composition TEXT,
      diameter REAL,
      weight REAL,
      mintage INTEGER,
      rarity_tier TEXT DEFAULT 'Common',
      description TEXT,
      image_url TEXT,
      series TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_coins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      coin_id TEXT,
      name TEXT,
      country TEXT,
      year INTEGER,
      denomination TEXT,
      grade TEXT,
      condition TEXT,
      purchase_price REAL,
      purchase_date TEXT,
      estimated_value REAL,
      rarity_tier TEXT DEFAULT 'Common',
      notes TEXT,
      image_url TEXT,
      images TEXT DEFAULT '[]',
      ai_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      image_url TEXT,
      result TEXT,
      confidence INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      user_coin_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      grade TEXT,
      condition TEXT,
      image_url TEXT,
      images TEXT DEFAULT '[]',
      coin_data TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      views INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      listing_id TEXT,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT DEFAULT 'showcase',
      content TEXT,
      coin_data TEXT DEFAULT '{}',
      image_url TEXT,
      estimated_value REAL,
      likes INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      requirement TEXT
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS crh_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT,
      bank TEXT,
      denomination TEXT,
      rolls_searched INTEGER DEFAULT 0,
      coins_found TEXT DEFAULT '[]',
      total_face_value REAL DEFAULT 0,
      melt_value REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT,
      title TEXT,
      message TEXT,
      data TEXT DEFAULT '{}',
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, listing_id)
    );
  `);
}

module.exports = { createSchema };
