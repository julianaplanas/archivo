const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM contacts ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name, birthday, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const r = db.prepare('INSERT INTO contacts (name, birthday, notes) VALUES (?, ?, ?)').run(name, birthday ?? null, notes ?? null);
  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Not found' });
  const { name, birthday, notes } = req.body;
  db.prepare('UPDATE contacts SET name=?, birthday=?, notes=? WHERE id=?').run(
    name ?? contact.name,
    birthday !== undefined ? birthday : contact.birthday,
    notes !== undefined ? notes : contact.notes,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
