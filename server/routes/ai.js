const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { db } = require('../db');

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://archivo.app',
    'X-Title': 'Archivo',
  },
});

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5';

// POST /api/ai/correlation-insight
router.post('/correlation-insight', async (req, res) => {
  const { trackerIds, days = 60 } = req.body;
  if (!trackerIds?.length) return res.status(400).json({ error: 'trackerIds required' });

  const trackers = trackerIds
    .map(id => db.prepare('SELECT * FROM trackers WHERE id = ?').get(id))
    .filter(Boolean);
  if (!trackers.length) return res.status(404).json({ error: 'No trackers found' });

  const data = trackers.map(t => ({
    name: t.name,
    emoji: t.emoji,
    type: t.type,
    mode: t.mode,
    entries: db.prepare(`
      SELECT value, notes, logged_at FROM tracker_entries
      WHERE tracker_id = ? AND logged_at >= datetime('now', '-${parseInt(days)} days')
      ORDER BY logged_at ASC
    `).all(t.id),
  }));

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content: 'You are Archivo, a personal life tracker assistant with a witty, casual, non-judgmental tone. You help people notice patterns in their own data. Never give medical advice. Keep responses short (2-4 sentences max). Be playful.',
      },
      {
        role: 'user',
        content: `Here's my tracking data for the last ${days} days: ${JSON.stringify(data)}. What patterns do you notice between these trackers: ${trackers.map(t => t.name).join(', ')}?`,
      },
    ],
  });

  res.json({ insight: response.choices[0].message.content });
});

// POST /api/ai/craft-suggestions
router.post('/craft-suggestions', async (req, res) => {
  const { contactId, occasion } = req.body;
  if (!contactId) return res.status(400).json({ error: 'contactId required' });

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const materials = db.prepare('SELECT * FROM materials').all();
  const daysUntil = contact.birthday
    ? Math.ceil((new Date(contact.birthday) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: 'You are Archivo, a craft-savvy assistant. Suggest handmade gift ideas that are realistic to make. Be enthusiastic but practical. Return ONLY valid JSON.',
      },
      {
        role: 'user',
        content: `I want to make a gift for ${contact.name}. Here's what I know about them: ${contact.notes || 'nothing specific'}. ${daysUntil ? `I have ${daysUntil} days.` : ''} ${occasion ? `Occasion: ${occasion}.` : ''} Here are the materials I already have: ${JSON.stringify(materials)}. Suggest 3 craft ideas as JSON array with fields: title, description, why_them, materials_needed (array of strings), materials_i_have (array of strings, subset of my inventory), difficulty (easy/medium/hard).`,
      },
    ],
  });

  try {
    const text = response.choices[0].message.content;
    const json = JSON.parse(text.match(/\[[\s\S]*\]/)[0]);
    res.json({ suggestions: json });
  } catch {
    res.json({ suggestions: [], raw: response.choices[0].message.content });
  }
});

module.exports = router;
