const express = require('express');
const router = express.Router();
const { db } = require('../db');

// DELETE /api/craft-images/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM craft_images WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
