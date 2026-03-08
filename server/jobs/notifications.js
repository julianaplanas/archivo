const cron = require('node-cron');
const { sendTrackerReminders } = require('../routes/push');

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

console.log('[cron] notification scheduler started');
