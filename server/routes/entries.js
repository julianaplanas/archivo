const express = require('express');
const router = express.Router();
const { db } = require('../db');

// PUT /api/entries/:id
router.put('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM tracker_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  const { value, notes, logged_at, entry_metadata } = req.body;
  db.prepare(`
    UPDATE tracker_entries SET value = ?, notes = ?, logged_at = ?, entry_metadata = ? WHERE id = ?
  `).run(
    value !== undefined ? String(value) : entry.value,
    notes !== undefined ? notes : entry.notes,
    logged_at ?? entry.logged_at,
    entry_metadata !== undefined ? JSON.stringify(entry_metadata) : entry.entry_metadata,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM tracker_entries WHERE id = ?').get(req.params.id));
});

// DELETE /api/entries/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tracker_entries WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
