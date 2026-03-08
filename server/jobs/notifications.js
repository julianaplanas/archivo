const cron = require('node-cron');
const webpush = require('web-push');
const { sendTrackerReminders } = require('../routes/push');
const { db } = require('../db');

// Run every minute — notification_times stored as UTC HH:MM in DB
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
  console.log(`[cron] checking notifications — ${timeStr} UTC`);
  try {
    await sendTrackerReminders(timeStr);
  } catch (err) {
    console.error('[cron] notification error:', err.message);
  }
});

// Monthly recap push — runs at 20:00 UTC on the last day of each month
cron.schedule('0 20 28-31 * *', async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  // Only fire on the actual last day of the month
  if (tomorrow.getUTCDate() !== 1) return;

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@archivo.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const subs = db.prepare('SELECT * FROM push_subscriptions').all();
  if (!subs.length) return;

  const monthName = now.toLocaleString('default', { month: 'long' });
  const payload = JSON.stringify({
    title: '📅 archivo',
    body: `${monthName} is almost over — your monthly recap is ready!`,
  });

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );
  console.log(`[cron] monthly recap push sent for ${monthName}`);
});

console.log('[cron] notification scheduler started');
