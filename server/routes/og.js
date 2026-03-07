const express = require('express');
const router = express.Router();
const ogs = require('open-graph-scraper');

// GET /api/og?url=...
router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const { result } = await ogs({ url });
    res.json({
      title: result.ogTitle || result.twitterTitle || null,
      image: result.ogImage?.[0]?.url || null,
      description: result.ogDescription || null,
    });
  } catch {
    res.json({ title: null, image: null, description: null });
  }
});

module.exports = router;
