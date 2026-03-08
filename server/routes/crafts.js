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

function attachCraftExtras(c) {
  return {
    ...c,
    tags: db.prepare('SELECT tag FROM craft_tags WHERE craft_id = ?').all(c.id).map(r => r.tag),
    images: db.prepare('SELECT * FROM craft_images WHERE craft_id = ?').all(c.id),
    materials: db.prepare('SELECT * FROM craft_material_items WHERE craft_id = ? ORDER BY id').all(c.id),
    source_urls: c.source_urls ? JSON.parse(c.source_urls) : (c.source_url ? [c.source_url] : []),
  };
}

// GET /api/crafts
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM crafts';
  const params = [];
  if (status) { query += ' WHERE status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC';
  const crafts = db.prepare(query).all(...params);
  res.json(crafts.map(attachCraftExtras));
});

// POST /api/crafts
router.post('/', upload.array('images', 10), (req, res) => {
  const { title, status = 'wishlist', description, source_url, source_urls, og_title, og_image, tags, for_person, deadline_date, deadline_label, materials } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  // Merge source_url + source_urls into canonical JSON array
  let urlsArr = [];
  if (source_urls) { try { urlsArr = JSON.parse(source_urls); } catch { urlsArr = [source_urls]; } }
  else if (source_url) urlsArr = [source_url];
  const primaryUrl = urlsArr[0] ?? null;

  const result = db.prepare(`
    INSERT INTO crafts (title, status, description, source_url, source_urls, og_title, og_image, for_person, deadline_date, deadline_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, status, description ?? null, primaryUrl, urlsArr.length ? JSON.stringify(urlsArr) : null,
    og_title ?? null, og_image ?? null, for_person ?? null, deadline_date ?? null, deadline_label ?? null);
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

  if (materials) {
    const matList = typeof materials === 'string' ? JSON.parse(materials) : materials;
    const insertMat = db.prepare('INSERT INTO craft_material_items (craft_id, name, quantity, unit, status) VALUES (?, ?, ?, ?, ?)');
    matList.forEach(m => insertMat.run(id, m.name, m.quantity ?? null, m.unit ?? null, m.status ?? 'need'));
  }

  res.status(201).json(attachCraftExtras(db.prepare('SELECT * FROM crafts WHERE id = ?').get(id)));
});

// GET /api/crafts/:id
router.get('/:id', (req, res) => {
  const craft = db.prepare('SELECT * FROM crafts WHERE id = ?').get(req.params.id);
  if (!craft) return res.status(404).json({ error: 'Not found' });
  res.json(attachCraftExtras(craft));
});

// PUT /api/crafts/:id
router.put('/:id', (req, res) => {
  const craft = db.prepare('SELECT * FROM crafts WHERE id = ?').get(req.params.id);
  if (!craft) return res.status(404).json({ error: 'Not found' });
  const { title, status, description, source_url, source_urls, og_title, og_image, completed_at, tags, for_person, deadline_date, deadline_label, materials } = req.body;

  let urlsArr = null;
  let primaryUrl = craft.source_url;
  if (source_urls !== undefined) {
    try { urlsArr = JSON.parse(source_urls); } catch { urlsArr = [source_urls]; }
    primaryUrl = urlsArr[0] ?? null;
  } else if (source_url !== undefined) {
    primaryUrl = source_url;
    urlsArr = source_url ? [source_url] : [];
  }

  db.prepare(`
    UPDATE crafts SET title=?, status=?, description=?, source_url=?, source_urls=?, og_title=?, og_image=?,
      completed_at=?, for_person=?, deadline_date=?, deadline_label=?
    WHERE id=?
  `).run(
    title ?? craft.title,
    status ?? craft.status,
    description !== undefined ? description : craft.description,
    primaryUrl,
    urlsArr !== null ? JSON.stringify(urlsArr) : craft.source_urls,
    og_title !== undefined ? og_title : craft.og_title,
    og_image !== undefined ? og_image : craft.og_image,
    completed_at !== undefined ? completed_at : craft.completed_at,
    for_person !== undefined ? for_person : craft.for_person,
    deadline_date !== undefined ? deadline_date : craft.deadline_date,
    deadline_label !== undefined ? deadline_label : craft.deadline_label,
    req.params.id
  );

  if (tags !== undefined) {
    db.prepare('DELETE FROM craft_tags WHERE craft_id = ?').run(req.params.id);
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    const insertTag = db.prepare('INSERT INTO craft_tags (craft_id, tag) VALUES (?, ?)');
    tagList.forEach(tag => tag && insertTag.run(req.params.id, tag));
  }

  if (materials !== undefined) {
    db.prepare('DELETE FROM craft_material_items WHERE craft_id = ?').run(req.params.id);
    const matList = typeof materials === 'string' ? JSON.parse(materials) : materials;
    const insertMat = db.prepare('INSERT INTO craft_material_items (craft_id, name, quantity, unit, status) VALUES (?, ?, ?, ?, ?)');
    matList.forEach(m => insertMat.run(req.params.id, m.name, m.quantity ?? null, m.unit ?? null, m.status ?? 'need'));
  }

  res.json(attachCraftExtras(db.prepare('SELECT * FROM crafts WHERE id = ?').get(req.params.id)));
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

// GET /api/craft-materials/shopping-list — all need-to-buy items across all crafts
router.get('/materials/shopping-list', (req, res) => {
  const items = db.prepare(`
    SELECT cmi.*, c.title as craft_title, c.id as craft_id
    FROM craft_material_items cmi
    JOIN crafts c ON c.id = cmi.craft_id
    WHERE cmi.status = 'need' AND cmi.purchased = 0
    ORDER BY cmi.name
  `).all();
  res.json(items);
});

// PATCH /api/craft-materials/:id/purchased
router.patch('/materials/:id/purchased', (req, res) => {
  const { purchased } = req.body;
  db.prepare('UPDATE craft_material_items SET purchased = ? WHERE id = ?').run(purchased ? 1 : 0, req.params.id);
  res.json({ success: true });
});

module.exports = router;
