const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const { db } = require('../db');

function initWebPush() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@archivo.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    return true;
  }
  return false;
}

// POST /api/push/subscribe
router.post('/subscribe', (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }
  db.prepare(`
    INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth)
    VALUES (?, ?, ?)
  `).run(endpoint, keys.p256dh, keys.auth);
  res.status(201).json({ success: true });
});

// POST /api/push/unsubscribe
router.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  res.json({ success: true });
});

// POST /api/push/test
router.post('/test', async (req, res) => {
  if (!initWebPush()) {
    return res.status(503).json({ error: 'VAPID keys not configured' });
  }
  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  if (!subs.length) return res.status(404).json({ error: 'No subscriptions found' });

  const payload = JSON.stringify({
    title: 'archivo 🗂',
    body: 'push notifications are working!',
  });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
    )
  );
  res.json({ sent: results.filter(r => r.status === 'fulfilled').length, total: subs.length });
});

// Export so cron jobs can use it
module.exports = router;
module.exports.sendTrackerReminders = async function () {
  if (!initWebPush()) return;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const trackers = db.prepare(`
    SELECT * FROM trackers WHERE notifications_enabled = 1 AND notification_time = ?
  `).all(timeStr);
  if (!trackers.length) return;

  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  for (const tracker of trackers) {
    const payload = JSON.stringify({
      title: `${tracker.emoji} ${tracker.name}`,
      body: `time to log your ${tracker.name.toLowerCase()} tracker`,
      data: { trackerId: tracker.id },
    });
    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      )
    );
  }
};
