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

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

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
// Convert a local HH:MM + IANA timezone to the current UTC HH:MM
function localTimeToUTC(hhmm, tz) {
  if (!hhmm || !tz) return hhmm; // fallback: treat as UTC if no timezone
  const [h, m] = hhmm.split(':').map(Number);
  // Build a date for today with the given local time in the given timezone
  const now = new Date();
  // Use a reference date (today) to get the correct UTC offset for this timezone right now (handles DST)
  const refDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0));
  // Get what time it is in the target timezone at our reference UTC time
  const localStr = refDate.toLocaleString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  // The difference between what we set (h:m UTC) and what the timezone shows tells us the offset
  const [localH, localM] = localStr.split(':').map(Number);
  const offsetMinutes = (localH * 60 + localM) - (h * 60 + m);
  // To convert local→UTC: subtract the offset
  let utcMinutes = h * 60 + m - offsetMinutes;
  utcMinutes = ((utcMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(utcMinutes / 60)).padStart(2, '0')}:${String(utcMinutes % 60).padStart(2, '0')}`;
}

module.exports.sendTrackerReminders = async function (timeStr) {
  if (!initWebPush()) return;
  // timeStr is UTC HH:MM passed from cron job
  // notification_times are stored as LOCAL times + timezone; convert to UTC at runtime for DST correctness
  const allTrackers = db.prepare('SELECT * FROM trackers WHERE notifications_enabled = 1').all();
  const trackers = allTrackers.filter(t => {
    const tz = t.notification_timezone;
    const times = [];
    if (t.notification_times) {
      try { times.push(...JSON.parse(t.notification_times)); } catch {}
    } else if (t.notification_time) {
      times.push(t.notification_time);
    }
    return times.some(localTime => localTimeToUTC(localTime, tz) === timeStr);
  });
  if (!trackers.length) return;

  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  for (const tracker of trackers) {
    const payload = JSON.stringify({
      title: `${tracker.emoji} ${tracker.name}`,
      body: `time to log your ${tracker.name.toLowerCase()} tracker`,
      data: { trackerId: tracker.id },
    });
    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      )
    );
    const sent = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[push] sent ${sent}/${subs.length} for tracker "${tracker.name}" at ${timeStr} UTC`);
  }
};
