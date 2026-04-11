const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { db } = require('../db');

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5';

function getClient() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'HTTP-Referer': 'https://archivo.app',
      'X-Title': 'Archivo',
    },
  });
}

// POST /api/ai/correlation-insight
router.post('/correlation-insight', async (req, res) => {
  try {
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

  const response = await getClient().chat.completions.create({
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
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// POST /api/ai/craft-suggestions
router.post('/craft-suggestions', async (req, res) => {
  try {
  const { contactId, occasion } = req.body;
  if (!contactId) return res.status(400).json({ error: 'contactId required' });

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const materials = db.prepare('SELECT * FROM materials').all();
  const daysUntil = contact.birthday
    ? Math.ceil((new Date(contact.birthday) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const response = await getClient().chat.completions.create({
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
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// POST /api/ai/book-autocomplete
router.post('/book-autocomplete', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length < 2) return res.json({ suggestions: [] });

    const response = await getClient().chat.completions.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: 'You are a book search assistant. Return ONLY valid JSON, no other text.',
        },
        {
          role: 'user',
          content: `The user is typing a book title or author: "${query.trim()}". Suggest up to 4 possible book matches. Return a JSON array with objects: [{title, author, year}]. Only include real books.`,
        },
      ],
    });

    try {
      const text = response.choices[0].message.content;
      const json = JSON.parse(text.match(/\[[\s\S]*\]/)[0]);
      res.json({ suggestions: json });
    } catch {
      res.json({ suggestions: [] });
    }
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// POST /api/ai/book-chat — conversational book recommendations based on reading history
router.post('/book-chat', async (req, res) => {
  try {
    const { messages = [] } = req.body;
    if (!messages.length) return res.status(400).json({ error: 'messages required' });

    // Fetch all read books with ratings and reviews
    const books = db.prepare(`
      SELECT title, author, rating, comment, date_finished
      FROM books WHERE status = 'read' ORDER BY date_finished DESC
    `).all();

    const readingList = books.map(b => {
      let line = `- "${b.title}" by ${b.author || 'unknown'}`;
      if (b.rating) line += ` (${b.rating}/5)`;
      if (b.comment) line += ` — "${b.comment}"`;
      return line;
    }).join('\n');

    const wantToRead = db.prepare(`SELECT title, author FROM books WHERE status = 'want_to_read'`).all();
    const wtrList = wantToRead.length
      ? '\n\nBooks already on my want-to-read list:\n' + wantToRead.map(b => `- "${b.title}" by ${b.author || 'unknown'}`).join('\n')
      : '';

    const systemPrompt = `You are Archivo's book recommender — a well-read, opinionated, casual literary friend. You know the user's full reading history and tastes intimately.

Here are all the books they've read, with their ratings and reviews:
${readingList}
${wtrList}

Guidelines:
- Recommend books based on their demonstrated taste, not generic bestseller lists
- Reference specific books they've read and why a recommendation connects ("you gave X a 5 and loved the prose — you'd dig Y for similar reasons")
- Be casual, enthusiastic, opinionated. Have strong takes. It's ok to be wrong.
- If they ask about a genre/mood/vibe, tailor to that
- Don't recommend books they've already read or that are on their want-to-read list
- Keep responses concise — 2-4 recommendations per message unless they ask for more
- You can discuss books they've read too, not just recommend new ones
- Write in the same language the user writes to you

IMPORTANT: After your response, add a line with exactly "---RECS---" followed by a JSON array of any books you recommended in this message. Format: [{"title":"...","author":"...","reason":"one-line why"}]. If you didn't recommend any specific books (e.g. you're just chatting about books they read), return an empty array [].`;

    const response = await getClient().chat.completions.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const raw = response.choices[0].message.content;
    let reply = raw;
    let recommendations = [];

    const recsSplit = raw.split('---RECS---');
    if (recsSplit.length > 1) {
      reply = recsSplit[0].trim();
      try {
        recommendations = JSON.parse(recsSplit[1].trim().match(/\[[\s\S]*\]/)[0]);
      } catch {}
    }

    res.json({ reply, recommendations });
  } catch (err) {
    console.error('[ai] book-chat error:', err);
    res.status(503).json({ error: err.message });
  }
});

module.exports = router;
