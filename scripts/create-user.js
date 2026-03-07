#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { db } = require('../server/db');

const [,, username, password] = process.argv;

if (!username || !password) {
  console.error('Usage: node scripts/create-user.js <username> <password>');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.error(`User already exists: ${username}`);
  process.exit(1);
}

const password_hash = bcrypt.hashSync(password, 12);
db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, password_hash);
console.log(`User created: ${username}`);
process.exit(0);
