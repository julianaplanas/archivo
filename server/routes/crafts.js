const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db, UPLOADS_PATH } = require('../db');

const storage = multer.diskStorage({
  destination: UPLOADS_PATH,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/crafts
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM crafts';
  const params = [];
  if (status) { query += ' WHERE status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC';
  const crafts = db.prepare(query).all(...params);
  // Attach tags and images
  const result = crafts.map(c => ({
    ...c,
    tags: db.prepare('SELECT tag FROM craft_tags WHERE craft_id = ?').all(c.id).map(r => r.tag),
    images: db.prepare('SELECT * FROM craft_images WHERE craft_id = ?').all(c.id),
  }));
  res.json(result);
});

// POST /api/crafts
router.post('/', upload.array('images', 10), (req, res) => {
  const { title, status = 'wishlist', description, source_url, og_title, og_image, tags, for_person } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const result = db.prepare(`
    INSERT INTO crafts (title, status, description, source_url, og_title, og_image, for_person)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, status, description ?? null, source_url ?? null, og_title ?? null, og_image ?? null, for_person ?? null);
  const id = result.lastInsertRowid;

  if (tags) {
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    const insertTag = db.prepare('INSERT INTO craft_tags (craft_id, tag) VALUES (?, ?)');
    tagList.forEach(tag => tag && insertTag.run(id, tag));
  }

  if (req.files?.length) {
    const insertImage = db.prepare('INSERT INTO craft_images (craft_id, filepath) VALUES (?, ?)');
    req.files.forEach(f => insertImage.run(id, f.filename));
  }

  const craft = db.prepare('SELECT * FROM crafts WHERE id = ?').get(id);
  res.status(201).json({
    ...craft,
    tags: db.prepare('SELECT tag FROM craft_tags WHERE craft_id = ?').all(id).map(r => r.tag),
    images: db.prepare('SELECT * FROM craft_images WHERE craft_id = ?').all(id),
  });
});

// GET /api/crafts/:id
router.get('/:id', (req, res) => {
  const craft = db.prepare('SELECT * FROM crafts WHERE id = ?').get(req.params.id);
  if (!craft) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...craft,
    tags: db.prepare('SELECT tag FROM craft_tags WHERE craft_id = ?').all(craft.id).map(r => r.tag),
    images: db.prepare('SELECT * FROM craft_images WHERE craft_id = ?').all(craft.id),
  });
});

// PUT /api/crafts/:id
router.put('/:id', (req, res) => {
  const craft = db.prepare('SELECT * FROM crafts WHERE id = ?').get(req.params.id);
  if (!craft) return res.status(404).json({ error: 'Not found' });
  const { title, status, description, source_url, og_title, og_image, completed_at, tags, for_person } = req.body;
  db.prepare(`
    UPDATE crafts SET title=?, status=?, description=?, source_url=?, og_title=?, og_image=?, completed_at=?, for_person=?
    WHERE id=?
  `).run(
    title ?? craft.title,
    status ?? craft.status,
    description !== undefined ? description : craft.description,
    source_url !== undefined ? source_url : craft.source_url,
    og_title !== undefined ? og_title : craft.og_title,
    og_image !== undefined ? og_image : craft.og_image,
    completed_at !== undefined ? completed_at : craft.completed_at,
    for_person !== undefined ? for_person : craft.for_person,
    req.params.id
  );
  if (tags !== undefined) {
    db.prepare('DELETE FROM craft_tags WHERE craft_id = ?').run(req.params.id);
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    const insertTag = db.prepare('INSERT INTO craft_tags (craft_id, tag) VALUES (?, ?)');
    tagList.forEach(tag => tag && insertTag.run(req.params.id, tag));
  }
  const updated = db.prepare('SELECT * FROM crafts WHERE id = ?').get(req.params.id);
  res.json({
    ...updated,
    tags: db.prepare('SELECT tag FROM craft_tags WHERE craft_id = ?').all(req.params.id).map(r => r.tag),
    images: db.prepare('SELECT * FROM craft_images WHERE craft_id = ?').all(req.params.id),
  });
});

// DELETE /api/crafts/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM crafts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// POST /api/crafts/:id/images
router.post('/:id/images', upload.array('images', 10), (req, res) => {
  const craft = db.prepare('SELECT * FROM crafts WHERE id = ?').get(req.params.id);
  if (!craft) return res.status(404).json({ error: 'Not found' });
  const insertImage = db.prepare('INSERT INTO craft_images (craft_id, filepath, caption) VALUES (?, ?, ?)');
  const images = (req.files || []).map(f => {
    const r = insertImage.run(req.params.id, f.filename, req.body.caption ?? null);
    return db.prepare('SELECT * FROM craft_images WHERE id = ?').get(r.lastInsertRowid);
  });
  res.status(201).json(images);
});

module.exports = router;
