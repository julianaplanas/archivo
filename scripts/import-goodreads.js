#!/usr/bin/env node
// Import books from a Goodreads CSV export into the Archivo database.
// Usage: node scripts/import-goodreads.js [path-to-csv]
// Default CSV path: ./goodreads_library_export.csv

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const csvPath = process.argv[2] || path.join(__dirname, '..', 'goodreads_library_export.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

// Initialize DB
const { db } = require('../server/db');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
});

const statusMap = {
  'read': 'read',
  'to-read': 'want_to_read',
  'currently-reading': 'reading',
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Goodreads format: YYYY/MM/DD → YYYY-MM-DD
  return dateStr.replace(/\//g, '-');
}

function cleanReview(review) {
  if (!review) return null;
  // Strip <br/> tags, trim
  return review.replace(/<br\s*\/?>/gi, '\n').trim() || null;
}

const insert = db.prepare(`
  INSERT INTO books (title, author, status, rating, comment, date_finished, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const existing = db.prepare('SELECT id FROM books WHERE title = ? AND author = ?');

let imported = 0;
let skipped = 0;

const importAll = db.transaction(() => {
  for (const row of records) {
    const title = row['Title'];
    const author = row['Author'];
    const shelf = row['Exclusive Shelf'] || 'read';
    const status = statusMap[shelf] || 'want_to_read';
    const rating = parseInt(row['My Rating'], 10) || null;
    const comment = cleanReview(row['My Review']);
    const dateFinished = parseDate(row['Date Read']);
    const dateAdded = parseDate(row['Date Added']) || new Date().toISOString();

    if (!title) continue;

    // Skip duplicates
    if (existing.get(title, author)) {
      skipped++;
      continue;
    }

    insert.run(title, author || null, status, rating === 0 ? null : rating, comment, dateFinished, dateAdded);
    imported++;
  }
});

importAll();

console.log(`imported ${imported} books, skipped ${skipped} duplicates`);
