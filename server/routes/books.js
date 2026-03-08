const express = require('express');
const router = express.Router();
const { db } = require('../db');

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
  res.status(201).json(db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid));
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
