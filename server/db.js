const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_PATH, 'archivo.db');
const UPLOADS_PATH = path.join(DATA_PATH, 'uploads');

// Ensure directories exist
fs.mkdirSync(DATA_PATH, { recursive: true });
fs.mkdirSync(UPLOADS_PATH, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trackers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '📌',
    type TEXT NOT NULL CHECK(type IN ('boolean', 'quantity', 'scale', 'text')),
    mode TEXT NOT NULL CHECK(mode IN ('quit', 'do_it', 'track_only')),
    goal_value REAL,
    goal_unit TEXT,
    notifications_enabled INTEGER NOT NULL DEFAULT 0,
    notification_time TEXT,
    color TEXT NOT NULL DEFAULT '#2563eb',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tracker_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
    value TEXT,
    notes TEXT,
    logged_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS crafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'wishlist' CHECK(status IN ('wishlist', 'in_progress', 'completed')),
    description TEXT,
    source_url TEXT,
    og_title TEXT,
    og_image TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS craft_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    craft_id INTEGER NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
    filepath TEXT NOT NULL,
    caption TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS craft_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    craft_id INTEGER NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
    tag TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT,
    category TEXT,
    notes TEXT,
    need_to_buy INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS craft_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    craft_id INTEGER NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    quantity_needed REAL,
    unit TEXT
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birthday TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_craft_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    craft_id INTEGER NOT NULL REFERENCES crafts(id) ON DELETE CASCADE,
    occasion TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrations — safe ALTER TABLE ADD COLUMN (SQLite throws if column exists, we ignore)
function addColumn(table, col, definition) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`); } catch {}
}
addColumn('trackers', 'max_entries_per_day', 'INTEGER NOT NULL DEFAULT 1');
addColumn('trackers', 'notification_times', 'TEXT');
addColumn('crafts', 'for_person', 'TEXT');
addColumn('trackers', 'frequency', 'TEXT NOT NULL DEFAULT "daily_once"');
addColumn('trackers', 'tracker_subtype', 'TEXT');
addColumn('tracker_entries', 'entry_metadata', 'TEXT');

// Auto-create admin user from env vars if no users exist
if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(process.env.ADMIN_USERNAME, hash);
    console.log(`[db] Created admin user: ${process.env.ADMIN_USERNAME}`);
  }
}

module.exports = { db, UPLOADS_PATH, DATA_PATH };
