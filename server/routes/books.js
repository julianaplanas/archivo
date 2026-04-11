const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { db } = require('../db');

const CSV_PATH = process.env.GOODREADS_CSV_PATH || path.join(__dirname, '..', '..', 'goodreads_library_export.csv');

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
