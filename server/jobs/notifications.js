const cron = require('node-cron');
const { sendTrackerReminders } = require('../routes/push');

// Run every minute to check for scheduled tracker notifications
cron.schedule('* * * * *', async () => {
  try {
    await sendTrackerReminders();
  } catch (err) {
    console.error('[cron] notification error:', err.message);
  }
});

console.log('[cron] notification scheduler started');
