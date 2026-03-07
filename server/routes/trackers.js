const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/trackers
router.get('/', (req, res) => {
  const trackers = db.prepare('SELECT * FROM trackers ORDER BY created_at ASC').all();
  res.json(trackers);
});

// POST /api/trackers
router.post('/', (req, res) => {
  const { name, emoji = '📌', type, mode, goal_value, goal_unit, notifications_enabled = 0, notification_time, color = '#4af0e4' } = req.body;
  if (!name || !type || !mode) return res.status(400).json({ error: 'name, type, mode required' });
  const result = db.prepare(`
    INSERT INTO trackers (name, emoji, type, mode, goal_value, goal_unit, notifications_enabled, notification_time, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, emoji, type, mode, goal_value ?? null, goal_unit ?? null, notifications_enabled ? 1 : 0, notification_time ?? null, color);
  res.status(201).json(db.prepare('SELECT * FROM trackers WHERE id = ?').get(result.lastInsertRowid));
});

// GET /api/trackers/:id
router.get('/:id', (req, res) => {
  const tracker = db.prepare('SELECT * FROM trackers WHERE id = ?').get(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'Not found' });
  res.json(tracker);
});

// PUT /api/trackers/:id
router.put('/:id', (req, res) => {
  const tracker = db.prepare('SELECT * FROM trackers WHERE id = ?').get(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'Not found' });
  const { name, emoji, type, mode, goal_value, goal_unit, notifications_enabled, notification_time, color } = req.body;
  db.prepare(`
    UPDATE trackers SET
      name = ?, emoji = ?, type = ?, mode = ?,
      goal_value = ?, goal_unit = ?, notifications_enabled = ?,
      notification_time = ?, color = ?
    WHERE id = ?
  `).run(
    name ?? tracker.name,
    emoji ?? tracker.emoji,
    type ?? tracker.type,
    mode ?? tracker.mode,
    goal_value !== undefined ? goal_value : tracker.goal_value,
    goal_unit !== undefined ? goal_unit : tracker.goal_unit,
    notifications_enabled !== undefined ? (notifications_enabled ? 1 : 0) : tracker.notifications_enabled,
    notification_time !== undefined ? notification_time : tracker.notification_time,
    color ?? tracker.color,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM trackers WHERE id = ?').get(req.params.id));
});

// DELETE /api/trackers/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM trackers WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// GET /api/trackers/:id/entries
router.get('/:id/entries', (req, res) => {
  const { days } = req.query;
  let query = 'SELECT * FROM tracker_entries WHERE tracker_id = ?';
  const params = [req.params.id];
  if (days) {
    query += ` AND logged_at >= datetime('now', '-${parseInt(days)} days')`;
  }
  query += ' ORDER BY logged_at DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/trackers/:id/entries
router.post('/:id/entries', (req, res) => {
  const tracker = db.prepare('SELECT * FROM trackers WHERE id = ?').get(req.params.id);
  if (!tracker) return res.status(404).json({ error: 'Tracker not found' });
  const { value, notes, logged_at } = req.body;
  const result = db.prepare(`
    INSERT INTO tracker_entries (tracker_id, value, notes, logged_at)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, value !== undefined ? String(value) : null, notes ?? null, logged_at ?? new Date().toISOString());
  res.status(201).json(db.prepare('SELECT * FROM tracker_entries WHERE id = ?').get(result.lastInsertRowid));
});

// POST /api/trackers/correlations/insight
router.post('/correlations/insight', async (req, res) => {
  // Handled in ai.js but registered here for route ordering
  res.status(501).json({ error: 'Use /api/ai/correlation-insight' });
});

module.exports = router;
