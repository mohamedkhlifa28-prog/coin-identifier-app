'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const { createSchema } = require('./schema');
const { seedDatabase } = require('./seed');

const DB_PATH = path.resolve(__dirname, '../../coinvault.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
createSchema(db);

// Seed data if users table is empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  seedDatabase(db);
}

module.exports = db;
