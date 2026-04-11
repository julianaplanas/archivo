const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const router = express.Router();
const { db } = require('../db');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const DATA_PATH = process.env.DATA_PATH || './data';
const CSV_PATH = path.join(DATA_PATH, 'goodreads_library_export.csv');

function escapeCsvField(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function appendBookToCsv(book) {
  try {
    if (!fs.existsSync(CSV_PATH)) return;
    const statusMap = { read: 'read', want_to_read: 'to-read', reading: 'currently-reading' };
    const dateStr = book.date_finished ? book.date_finished.replace(/-/g, '/') : '';
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    // Goodreads CSV columns: Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies
    const row = [
      '',                                          // Book Id
      escapeCsvField(book.title),                  // Title
      escapeCsvField(book.author || ''),           // Author
      '',                                          // Author l-f
      '',                                          // Additional Authors
      '',                                          // ISBN
      '',                                          // ISBN13
      book.rating || 0,                            // My Rating
      '',                                          // Publisher
      '',                                          // Binding
      '',                                          // Number of Pages
      '',                                          // Year Published
      '',                                          // Original Publication Year
      dateStr,                                     // Date Read
      now,                                         // Date Added
      '',                                          // Bookshelves
      '',                                          // Bookshelves with positions
      statusMap[book.status] || 'read',            // Exclusive Shelf
      escapeCsvField(book.comment || ''),          // My Review
      '',                                          // Spoiler
      '',                                          // Private Notes
      book.status === 'read' ? 1 : 0,             // Read Count
      0,                                           // Owned Copies
    ].join(',');
    fs.appendFileSync(CSV_PATH, row + '\n');
  } catch (err) {
    console.error('[books] failed to append to CSV:', err.message);
  }
}

// GET /api/books
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM books';
  const params = [];
  if (status) { query += ' WHERE status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/books
router.post('/', (req, res) => {
  const { title, author, status = 'want_to_read', rating, comment, date_finished } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const result = db.prepare(`
    INSERT INTO books (title, author, status, rating, comment, date_finished)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, author ?? null, status, rating ?? null, comment ?? null, date_finished ?? null);
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  appendBookToCsv(book);
  res.status(201).json(book);
});

// POST /api/books/import-csv — upload Goodreads CSV to import books
router.post('/import-csv', csvUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
  try {
    const records = parse(req.file.buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    const statusMap = { 'read': 'read', 'to-read': 'want_to_read', 'currently-reading': 'reading' };
    const insert = db.prepare(`
      INSERT INTO books (title, author, status, rating, comment, date_finished, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const existing = db.prepare('SELECT id FROM books WHERE title = ? AND author = ?');

    let imported = 0, skipped = 0;

    const importAll = db.transaction(() => {
      for (const row of records) {
        const title = row['Title'];
        const author = row['Author'];
        if (!title) continue;
        if (existing.get(title, author)) { skipped++; continue; }

        const shelf = row['Exclusive Shelf'] || 'read';
        const status = statusMap[shelf] || 'want_to_read';
        const rating = parseInt(row['My Rating'], 10) || null;
        const comment = (row['My Review'] || '').replace(/<br\s*\/?>/gi, '\n').trim() || null;
        const dateFinished = row['Date Read'] ? row['Date Read'].replace(/\//g, '-') : null;
        const dateAdded = row['Date Added'] ? row['Date Added'].replace(/\//g, '-') : new Date().toISOString();

        insert.run(title, author || null, status, rating === 0 ? null : rating, comment, dateFinished, dateAdded);
        imported++;
      }
    });

    importAll();

    // Also save the CSV to the data volume for future reference
    const dataPath = process.env.DATA_PATH || './data';
    fs.writeFileSync(path.join(dataPath, 'goodreads_library_export.csv'), req.file.buffer);

    res.json({ imported, skipped });
  } catch (err) {
    console.error('[books] CSV import error:', err);
    res.status(500).json({ error: 'failed to parse CSV' });
  }
});

// GET /api/books/:id
router.get('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Not found' });
  res.json(book);
});

// PUT /api/books/:id
router.put('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Not found' });
  const { title, author, status, rating, comment, date_finished } = req.body;
  db.prepare(`
    UPDATE books SET title=?, author=?, status=?, rating=?, comment=?, date_finished=? WHERE id=?
  `).run(
    title ?? book.title,
    author !== undefined ? author : book.author,
    status ?? book.status,
    rating !== undefined ? rating : book.rating,
    comment !== undefined ? comment : book.comment,
    date_finished !== undefined ? date_finished : book.date_finished,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id));
});

// DELETE /api/books/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
