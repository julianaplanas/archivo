# Claude Code Prompt: Archivo

## Project Overview

Build **Archivo** — a personal PWA (Progressive Web App) that is part life tracker, part personal archive, part craft companion. It should feel like a hacked-together zine: playful, a little raw, deeply personal, and genuinely useful. Think Notion meets a sticker-covered notebook meets a terminal app. Not corporate. Not polished into blandness. *Yours.*

Deploy target: **Railway Hobby Plan** (one service + one volume). Phone access via **PWA install** (no App Store).

---

## Tech Stack

### Frontend
- **React** (Vite) — single-page app, mobile-first
- **PWA** with full manifest + service worker for home screen install & offline support
- Push notifications via Web Push API (iOS 16.4+ compatible)
- **Design aesthetic**: playful-hacky. Think: monospace mixed with a handwritten-feel display font, a dark background with neon-ish accent colors, slightly off-grid layouts, sticker-like UI elements, micro-animations that feel alive but not showy. NOT generic SaaS. NOT purple gradients. Use something like `IBM Plex Mono` or `Space Mono` for UI chrome and a chunky display font like `Fraunces` or `Syne` for headers. Color palette suggestion: near-black base (`#0f0f0f`), warm off-white text, with 2–3 punchy accents (coral, lime, electric blue — pick a cohesive set). Every section of the app should feel like a different "page" of the same zine.
- **Recharts** for data visualizations
- **date-fns** for date manipulation

### Backend
- **Node.js + Express** REST API
- **SQLite** via `better-sqlite3`, stored on a **Railway Volume** mounted at `/data/archivo.db`
- **Multer** for image/file uploads (also stored on the volume at `/data/uploads/`)
- **Anthropic SDK** (`@anthropic-ai/sdk`) for AI features — use `claude-sonnet-4-5` as the model
- **web-push** library for push notification delivery
- **node-cron** for scheduled daily notification jobs

### Infrastructure
- Single Railway service (serves both API and the built React frontend as static files)
- Railway Volume mounted at `/data`
- Environment variables: `ANTHROPIC_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- `railway.json` or `nixpacks.toml` configured for build + start

---

## Authentication

Archivo uses simple JWT-based auth. No registration UI — users are created via a CLI script. This keeps it personal and invite-only.

### Approach
- `bcrypt` for password hashing
- `jsonwebtoken` for JWT signing/verification
- JWT secret stored in env var `JWT_SECRET`
- Tokens expire after 30 days (long-lived, it's a personal app)
- Token stored in `localStorage` on the frontend

### Backend
- Add a `users` table (see schema below)
- `POST /api/auth/login` — accepts `{ username, password }`, returns `{ token, username }`
- `GET /api/auth/me` — returns current user info (used on app load to validate token)
- Express middleware `requireAuth` applied to ALL `/api/*` routes except `/api/health`, `/api/auth/login`
- Middleware checks `Authorization: Bearer <token>` header, verifies JWT, attaches `req.user`

### Frontend
- If no valid token in localStorage → show a minimal login screen (full-page, matches the zine aesthetic — dark, monospace, a single form)
- On login success → store token, load the app
- Attach token to every API request via an axios instance or fetch wrapper with default headers
- On 401 response → clear token, redirect to login

### User Management Script
Create `scripts/create-user.js` — run with `node scripts/create-user.js <username> <password>`. Hashes the password and inserts into the DB. Log "User created: username" on success. This is how you add yourself and any future friends.

### Environment Variables to add
```
JWT_SECRET=       # long random string, generate with: openssl rand -base64 32
```

### Design note
The login screen should feel like unlocking a personal journal — not a SaaS product. Think: large "archivo" logotype, a single username/password input, a chunky "unlock" button. No "forgot password", no "sign up". Intentionally minimal.

---

## Database Schema

Design a flexible SQLite schema. Key tables:

```sql
-- Users (invite-only, created via CLI script)
users (id, username, password_hash, created_at)

-- Core tracker/archive entries
trackers (id, name, emoji, type, mode, goal_value, goal_unit, notifications_enabled, color, created_at)
-- type: 'boolean' | 'quantity' | 'scale' | 'text'
-- mode: 'quit' | 'do_it' | 'track_only'

tracker_entries (id, tracker_id, value, notes, logged_at, created_at)

-- Craft archive
crafts (id, title, status, description, source_url, created_at)
-- status: 'wishlist' | 'in_progress' | 'completed'

craft_images (id, craft_id, filepath, caption, created_at)

craft_tags (id, craft_id, tag)

-- Materials inventory
materials (id, name, quantity, unit, category, notes, created_at)

craft_materials (id, craft_id, material_id, quantity_needed, unit)

-- Contacts/birthdays (for gift suggestions)
contacts (id, name, birthday, notes, created_at)

contact_craft_links (id, contact_id, craft_id, occasion, notes)

-- Push notification subscriptions
push_subscriptions (id, endpoint, p256dh, auth, created_at)
```

---

## App Structure & Features

### Navigation
Bottom tab bar (mobile-first), 4 main sections:
1. 🗂 **Archivo** (home / dashboard)
2. 📊 **Trackers**
3. ✂️ **Crafts**
4. ⚙️ **Settings**

---

### 1. Home / Dashboard (`/`)

- Greeting with current date in a fun format ("saturday, 7th of march")
- Quick-log panel: shows today's trackers as tappable cards — one tap to log a boolean, tap+hold or swipe up for quantity/notes
- "Today at a glance" strip showing streaks and whether you've logged each tracker today
- Mini mood/pattern surface: one interesting correlation or stat surfaced automatically (e.g., "you went to the gym 3x this week and logged 0 sugar days — nice 👀")
- Upcoming birthdays (next 30 days) with a CTA to "get craft ideas"

---

### 2. Trackers (`/trackers`)

#### Creating a Tracker
When a user creates a tracker, they configure:
- **Name** + emoji
- **Entry type**: Boolean (did/didn't), Quantity (how much), Scale (1–10), Text (free note)
- **Mode**:
  - 🚫 *I want to quit* — goal is zero/none. Streak counts days without it. Celebrate milestones.
  - ✅ *I want to do it* — goal is consistency. Streak counts consecutive days done.
  - 👁 *Just tracking* — no judgment, just data. No streak pressure.
- **Goal** (optional): e.g. "0 days of sugar per week" or "gym 3x per week"
- **Daily notification**: toggle on/off, set time

Presets to offer on creation: Menstruation 🩸, Sugar 🍬, Gym 💪, Poop 💩, Daily Meds 💊 — but fully customizable.

#### Tracker Detail View
Each tracker gets its own page with:
- **Calendar heatmap** (GitHub-style, last 3 months): color intensity = value. For boolean, filled = done. For quit mode, inverted (filled = relapsed, empty = clean).
- **Streak counter** with a playful animation on milestone days (7, 14, 30, 60, 90)
- **Monthly summary card**: auto-generated fun stats ("you logged this 18/31 days last month — that's 58%, up from 41% 🔺")
- Log history (scrollable, editable)
- Quick-add button

#### Correlations View (`/trackers/correlations`)
- Select 2–3 trackers to compare
- Show a dual-axis line/bar chart over time
- AI-generated insight: call Claude API with the last 60 days of data for the selected trackers and ask it to identify any interesting patterns, correlations, or observations in a casual, non-medical tone. Display as a "🤖 archivo thinks..." card. Keep it light and fun, not clinical.

---

### 3. Crafts (`/crafts`)

Three sub-tabs: **Wishlist** | **Completed** | **Materials**

#### Wishlist
- Add a craft: title, description, source URL (auto-fetch OG title/image if possible), upload images, add tags
- Tappable cards with image thumbnails, tags shown as sticker-like chips
- Link a craft to a contact (birthday gift idea)
- "Move to completed" action

#### Completed Log
- Same card layout but with completion date
- Photos of finished crafts
- Notes field

#### Materials Inventory
- List of materials: name, quantity, unit, category
- Mark as "need to buy" vs "have it"
- When viewing a craft, show "what you have" vs "what you need" from your inventory

#### AI: Birthday Gift Craft Suggestion
- From a contact's birthday page (or a button on the home dashboard), user can tap "get craft ideas"
- Sends to Claude: contact's name, birthday occasion, any notes about them, user's current materials inventory
- Claude returns 3 craft suggestions with: title, why it suits this person, rough materials needed, difficulty level
- Display as swipeable cards with a fun "✨ archivo suggests..." header

---

### 4. Settings (`/settings`)

- Manage push notification subscriptions
- View/edit all trackers
- Export data (JSON dump of everything)
- About section with app version
- VAPID key setup instructions (shown on first run if not configured)

---

## API Routes

```
# Trackers
GET    /api/trackers
POST   /api/trackers
GET    /api/trackers/:id
PUT    /api/trackers/:id
DELETE /api/trackers/:id
GET    /api/trackers/:id/entries
POST   /api/trackers/:id/entries
PUT    /api/entries/:id
DELETE /api/entries/:id

# AI: correlation insight
POST   /api/trackers/correlations/insight
# body: { trackerIds: [], days: 60 }

# Crafts
GET    /api/crafts
POST   /api/crafts          (multipart/form-data with images)
GET    /api/crafts/:id
PUT    /api/crafts/:id
DELETE /api/crafts/:id
POST   /api/crafts/:id/images
DELETE /api/craft-images/:id

# Materials
GET    /api/materials
POST   /api/materials
PUT    /api/materials/:id
DELETE /api/materials/:id

# Contacts
GET    /api/contacts
POST   /api/contacts
PUT    /api/contacts/:id
DELETE /api/contacts/:id

# AI: birthday craft suggestions
POST   /api/ai/craft-suggestions
# body: { contactId, occasion }

# Push notifications
POST   /api/push/subscribe
POST   /api/push/unsubscribe
POST   /api/push/test

# OG scraping
GET    /api/og?url=...
```

---

## AI Integration Details

Use `@anthropic-ai/sdk`. All AI calls go through a server-side `/api/ai/...` route — never expose the API key to the frontend.

### Correlation Insight
```
System: You are Archivo, a personal life tracker assistant with a witty, casual, non-judgmental tone. You help people notice patterns in their own data. Never give medical advice. Keep responses short (2-4 sentences max). Be playful.

User: Here's my tracking data for the last 60 days: [JSON]. What patterns do you notice between these trackers: [names]?
```

### Craft Suggestions for Birthday
```
System: You are Archivo, a craft-savvy assistant. Suggest handmade gift ideas that are realistic to make. Be enthusiastic but practical. Return ONLY valid JSON.

User: I want to make a gift for [name]. Here's what I know about them: [notes]. My birthday is [date] so I have [X] days. Here are the materials I already have: [inventory JSON]. Suggest 3 craft ideas as JSON array with fields: title, description, why_them, materials_needed (array), materials_i_have (array, subset of my inventory), difficulty (easy/medium/hard).
```

---

## PWA Configuration

`manifest.json`:
- `name`: "Archivo"
- `short_name`: "Archivo"
- `display`: `standalone`
- `theme_color`: `#0f0f0f`
- `background_color`: `#0f0f0f`
- Icons at 192x192 and 512x512 (generate simple text-based SVG icons with the 🗂 emoji or "AR" monogram)

Service Worker:
- Cache shell (app shell caching strategy)
- Handle push notification events
- Show notification with title, body, icon
- On notification click → open app to relevant tracker

---

## Railway Deployment

### File structure
```
/
├── client/          (Vite React app)
│   ├── src/
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js
│   └── vite.config.js
├── server/          (Express API)
│   ├── index.js
│   ├── db.js
│   ├── routes/
│   └── jobs/        (cron jobs for notifications)
├── package.json     (root — scripts for build + start)
└── nixpacks.toml    (or railway.json)
```

### Build & Start
- `build`: `cd client && npm install && npm run build`
- `start`: `node server/index.js`
- Express serves `client/dist` as static files in production
- All `/api/*` routes handled by Express

### Environment Variables to set in Railway
```
JWT_SECRET=        # generate: openssl rand -base64 32
ANTHROPIC_API_KEY=
VAPID_PUBLIC_KEY=      # generate with web-push generateVAPIDKeys()
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:your@email.com
NODE_ENV=production
PORT=3000
DATA_PATH=/data        # Railway volume mount point
```

### Volume
Mount a Railway Volume at `/data`. The server creates `/data/uploads/` directory on startup if it doesn't exist. SQLite db at `/data/archivo.db`.

---

## Design System Notes

Commit to this aesthetic throughout. Every screen should feel like the same zine:

- **Fonts**: Load from Google Fonts — `Syne` (800 weight) for display/headers, `IBM Plex Mono` for all UI labels, metadata, numbers
- **Colors** (CSS variables):
  ```css
  --bg: #0d0d0d;
  --surface: #1a1a1a;
  --surface-2: #242424;
  --text: #f0ece0;
  --text-muted: #7a7570;
  --accent-coral: #ff6b4a;
  --accent-lime: #c8f135;
  --accent-blue: #4af0e4;
  --border: #2e2e2e;
  ```
- Tracker cards: slightly rotated sticker-like border with a colored left-edge accent
- Streak numbers: large, monospace, bold — the number IS the design
- Heatmap: use lime → coral gradient for intensity (not the default green)
- Buttons: chunky, slightly rounded, with a subtle 2px offset drop shadow on hover
- Empty states: fun illustrated ASCII art or emoji compositions, never just "No data yet."
- Micro-animations: entry cards slide in with a slight bounce on load; streak milestone triggers a confetti burst (use `canvas-confetti`)

---

## Development Notes

- Start the DB with all tables created on first run (use `CREATE TABLE IF NOT EXISTS`)
- Seed with a few sample trackers so the UI isn't empty on first open
- Add a `GET /api/health` route for Railway health checks
- Console.log startup info: port, data path, db location
- All dates stored as ISO strings in UTC; displayed in local time on frontend
- Image uploads: save to `/data/uploads/{uuid}.{ext}`, serve via `/uploads/:filename` static route
- For OG scraping use `open-graph-scraper` npm package
- Write a `scripts/generate-vapid-keys.js` helper that logs the keys so user can paste them into Railway env vars

---

## What to Build First (suggested order)

1. Project scaffold + Railway config + SQLite setup
2. Auth: users table + JWT login + requireAuth middleware + create-user script
3. Tracker CRUD + entry logging (the core)
3. Home dashboard with quick-log
4. Calendar heatmap + streak counter visualizations
5. PWA manifest + service worker
6. Crafts: wishlist + completed
7. Push notifications + cron jobs
8. AI: correlation insights
9. AI: birthday craft suggestions
10. Materials inventory
11. Correlations view
12. Polish: animations, empty states, mobile edge cases

---

## Future Features (don't build now, but architect to support)

- Google Calendar sync for birthdays (OAuth)
- Export to PDF / share a "monthly recap" image
- Multiple users / auth (currently single-user, no auth needed)
- Mood tracker with free-text journaling
- Recipe/pattern storage for crafts
- Shopping list generation from materials needed
- Habit streaks shared with a friend (accountability buddy)