require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

process.on('uncaughtException', (err) => {
  console.error('[archivo] uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[archivo] unhandledRejection:', reason);
  process.exit(1);
});

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Init DB (creates tables + seeds on first run)
const { db, UPLOADS_PATH, DATA_PATH } = require('./db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_PATH));

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: NODE_ENV, db: DATA_PATH });
});

// Auth middleware
const { requireAuth } = require('./middleware/auth');

// Auth routes (no requireAuth)
app.use('/api/auth', require('./routes/auth'));

// Protected API routes
app.use('/api/trackers', requireAuth, require('./routes/trackers'));
app.use('/api/entries', requireAuth, require('./routes/entries'));
app.use('/api/crafts', requireAuth, require('./routes/crafts'));
app.use('/api/craft-images', requireAuth, require('./routes/craftImages'));
app.use('/api/materials', requireAuth, require('./routes/materials'));
app.use('/api/contacts', requireAuth, require('./routes/contacts'));
app.use('/api/push', requireAuth, require('./routes/push'));
app.use('/api/ai', requireAuth, require('./routes/ai'));
app.use('/api/og', requireAuth, require('./routes/og'));

// Serve React frontend whenever client/dist exists
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('archivo API is running — client/dist not found, run `npm run build` first.');
  });
}

// Start push notification cron job
require('./jobs/notifications');

app.listen(PORT, () => {
  console.log(`[archivo] server running on port ${PORT}`);
  console.log(`[archivo] env: ${NODE_ENV}`);
  console.log(`[archivo] data path: ${DATA_PATH}`);
  console.log(`[archivo] db: ${DATA_PATH}/archivo.db`);
});
