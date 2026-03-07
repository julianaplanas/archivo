const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM materials ORDER BY category, name').all());
});

router.post('/', (req, res) => {
  const { name, quantity = 0, unit, category, notes, need_to_buy = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = db.prepare(`
    INSERT INTO materials (name, quantity, unit, category, notes, need_to_buy)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, quantity, unit ?? null, category ?? null, notes ?? null, need_to_buy ? 1 : 0);
  res.status(201).json(db.prepare('SELECT * FROM materials WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const mat = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!mat) return res.status(404).json({ error: 'Not found' });
  const { name, quantity, unit, category, notes, need_to_buy } = req.body;
  db.prepare(`
    UPDATE materials SET name=?, quantity=?, unit=?, category=?, notes=?, need_to_buy=? WHERE id=?
  `).run(
    name ?? mat.name,
    quantity !== undefined ? quantity : mat.quantity,
    unit !== undefined ? unit : mat.unit,
    category !== undefined ? category : mat.category,
    notes !== undefined ? notes : mat.notes,
    need_to_buy !== undefined ? (need_to_buy ? 1 : 0) : mat.need_to_buy,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
