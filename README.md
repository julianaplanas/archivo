# archivo 🗂

A personal PWA (Progressive Web App) that is part life tracker, part personal archive, part craft companion. Built to feel like a hacked-together zine: playful, a little raw, deeply personal, and genuinely useful.

Deploy to Railway, install on your iPhone home screen, use it like a native app — no App Store required.

---

## Build Progress

### ✅ Done

| Step | What was built |
|---|---|
| 1. Scaffold | Express + SQLite + Railway config (`nixpacks.toml`), full DB schema (10 tables), seed data, all API route stubs |
| 2. Auth | JWT login, `requireAuth` middleware, `create-user.js` CLI script, login page UI |
| 3. Tracker CRUD | Tracker list, create/edit/delete, 4 entry types, 3 modes, LogEntryModal, TrackerDetail with entry history + monthly stats |
| 4. Home dashboard | Greeting, horizontal quick-log strip, today-at-a-glance chips, auto-generated mini-stat, upcoming birthdays |
| 5. Heatmap + confetti | GitHub-style 13-week calendar heatmap (lime→coral gradient, mode-aware), `canvas-confetti` on 7/14/30/60/90-day milestones |
| 6. PWA | `manifest.json` + service worker via `vite-plugin-pwa`, offline shell caching, push notification event handler |
| 7. Crafts | Wishlist + completed tabs, CraftCard with image/tags/source link, CreateCraftModal with OG-scrape, tag chips, photo upload |
| 8. OpenRouter | Swapped Anthropic SDK → `openai` package pointed at OpenRouter. `OPENROUTER_API_KEY` + optional `OPENROUTER_MODEL` env var |

### ⏳ Remaining

| Step | What's planned |
|---|---|
| 9. Push notifications | Web Push subscribe/unsubscribe UI in Settings, test notification button, node-cron delivery wired up |
| 10. AI: correlation insight | Correlations view — pick 2–3 trackers, dual-axis chart, "archivo thinks..." AI pattern card |
| 11. AI: craft suggestions | From a contact's birthday page, call OpenRouter → 3 swipeable craft idea cards |
| 12. Materials inventory | Materials list in Crafts tab, "have it / need to buy" toggle, link materials to crafts |
| 13. Settings page | Push subscription management, tracker list, JSON data export, app version |
| 14. Polish | Entry animations, empty states with ASCII art, mobile edge cases, confetti refinement |

---

## Features

### Auth & core
- **JWT auth** — invite-only, no registration UI. Add users via CLI script.
- **Tracker CRUD** — create, edit, and delete trackers with full configuration
- **4 entry types** — boolean (did/didn't), quantity (how much), scale (1–10), text note
- **3 tracker modes** — quit (streak = days clean), do it (streak = consecutive days), track only (no streak pressure)
- **Smart streak calculation** — streak survives mid-day gaps, milestones at 7/14/30/60/90 days
- **Milestone confetti** — canvas-confetti fires on 7/14/30/60/90-day streak milestones
- **Calendar heatmap** — GitHub-style 13-week grid, lime→coral gradient, mode-aware coloring, tap for day details
- **Quick-log** — one tap to log a boolean tracker from the list or home dashboard
- **Home dashboard** — fun date greeting, horizontal quick-log strip, today-at-a-glance chips, auto mini-stat, upcoming birthdays
- **Entry history** — editable, deletable, with datetime picker
- **Monthly stats** — logged days, % of month, trend vs last month
- **Tracker presets** — Gym, Sugar, Daily Meds, Poop, Period, Water, Mood, Journal
- **Goal tracking** — optional goal value + unit per tracker
- **Daily reminders** — per-tracker notification time (push delivery coming in next phase)

### Crafts
- **Wishlist** — add crafts with title, description, source URL (auto OG-scrape), tags, photo uploads
- **Completed log** — mark wishlist items done, completion date tracked
- **Sticker-like tag chips** — slight alternating rotation, monospace font

### Infrastructure
- **PWA** — installs to iPhone home screen, offline-capable via service worker
- **AI via OpenRouter** — default model `anthropic/claude-sonnet-4-5`, overridable per deploy
- **Zine aesthetic** — dark background, monospace + display fonts, punchy accent colors

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), React Router, PWA via vite-plugin-pwa |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3`, stored on a Railway Volume |
| Auth | JWT (30-day tokens), `bcryptjs` for password hashing |
| File uploads | Multer (images stored on Railway Volume) |
| AI | OpenRouter (`openai` SDK, default model: `anthropic/claude-sonnet-4-5`) |
| Push notifications | `web-push` (VAPID) |
| Scheduled jobs | `node-cron` |
| Fonts | Syne 800 (display) + IBM Plex Mono (UI) |
| Deploy | Railway Hobby Plan (one service + one volume) |

---

## Local Development

### Prerequisites

- Node.js 20+ (tested on v25.2.1)
- npm

### Setup

```bash
# Clone and install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Copy env file and fill in values
cp .env.example .env
```

Edit `.env`:

```env
JWT_SECRET=            # generate: openssl rand -base64 32
OPENROUTER_API_KEY=    # from openrouter.ai/keys
VAPID_PUBLIC_KEY=      # generate: node scripts/generate-vapid-keys.js
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:you@example.com
NODE_ENV=development
PORT=3000
DATA_PATH=./data
```

### Create your first user

```bash
node scripts/create-user.js yourname yourpassword
```

### Run

In two terminals:

```bash
# Terminal 1 — API server
node server/index.js

# Terminal 2 — Vite dev server (hot reload)
cd client && npm run dev
```

Open `http://localhost:5173` — the Vite dev server proxies `/api` requests to `localhost:3000`.

---

## Deployment (Railway)

### 1. Create a Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **service** — connect your GitHub repo (or use the Railway CLI: `railway link`)

### 2. Add a Volume

1. In your service's settings, go to **Volumes**
2. Click **Add Volume**
3. Set mount path to `/data`

This is where your SQLite database and uploaded files will live across deploys.

### 3. Set environment variables

In your Railway service → **Variables**, add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATA_PATH` | `/data` |
| `JWT_SECRET` | Run `openssl rand -base64 32` locally and paste the result |
| `OPENROUTER_API_KEY` | Your key from [openrouter.ai/keys](https://openrouter.ai/keys) |
| `VAPID_PUBLIC_KEY` | See VAPID key setup below |
| `VAPID_PRIVATE_KEY` | See VAPID key setup below |
| `VAPID_EMAIL` | `mailto:you@example.com` |

#### Generating VAPID keys (for push notifications)

Run this locally once — you only ever need to do this once:

```bash
node scripts/generate-vapid-keys.js
```

Copy the three lines it prints into Railway's environment variables.

### 4. Deploy

Railway will detect `nixpacks.toml` and run:
- **Build**: `cd client && npm install && npm run build`
- **Start**: `node server/index.js`

Push to your connected branch and Railway will deploy automatically.

### 5. Create your user on Railway

> ⚠️ **Important:** `railway run` executes commands **locally on your machine**, not inside the Railway container. The user would be created in a local database, not the production one. Use the Railway dashboard shell instead.

In your Railway dashboard → select your service → click **"Shell"** (or the terminal icon). Then run:

```bash
node scripts/create-user.js yourname yourpassword
```

This runs inside the container with access to the production volume at `/data/archivo.db`.

### 6. Get your app URL

Railway assigns a URL like `yourapp.railway.app`. You can also set a custom domain in service settings.

---

## Installing on iPhone (PWA)

Archivo is a Progressive Web App — it installs directly from Safari to your home screen and runs like a native app (full screen, no browser chrome, offline-capable).

> **Important:** You must use **Safari** on iOS. Chrome and Firefox on iOS cannot install PWAs to the home screen.

### Steps

1. Open Safari on your iPhone
2. Navigate to your Railway app URL (e.g. `https://yourapp.railway.app`)
3. Log in with your credentials
4. Tap the **Share** button at the bottom of the screen (the box with an arrow pointing up)
5. Scroll down in the share sheet and tap **"Add to Home Screen"**
6. Edit the name if you want (it defaults to "Archivo"), then tap **"Add"** in the top right
7. The app icon will appear on your home screen

When you open it from the home screen it launches full-screen with no browser UI — it looks and feels like a native app.

### Enabling push notifications (iOS 16.4+)

Push notifications for web apps require iOS 16.4 or later **and** the app must be installed to the home screen first.

1. Install the app to your home screen using the steps above
2. Open the app from the home screen (not from Safari)
3. Navigate to **Settings** (⚙️ tab)
4. Tap "Enable notifications"
5. When iOS prompts you to allow notifications, tap **Allow**

Once enabled, you'll receive daily reminders for trackers that have notifications turned on.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Long random string for signing JWTs. Generate with `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | For AI features | Your key from [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | No | Override the AI model (default: `anthropic/claude-sonnet-4-5`) |
| `VAPID_PUBLIC_KEY` | For push notifications | Generate with `node scripts/generate-vapid-keys.js` |
| `VAPID_PRIVATE_KEY` | For push notifications | Same generation script |
| `VAPID_EMAIL` | For push notifications | Contact email for VAPID, format: `mailto:you@example.com` |
| `NODE_ENV` | Yes | `production` on Railway, `development` locally |
| `PORT` | Yes | Port to listen on. Railway sets this automatically, default `3000` |
| `DATA_PATH` | Yes | Where to store the SQLite DB and uploads. Use `/data` on Railway, `./data` locally |

---

## API Reference

All routes under `/api/*` except `/api/health` and `/api/auth/login` require:

```
Authorization: Bearer <your-jwt-token>
```

### Auth

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/login` | `{ username, password }` → `{ token, username }` |
| `GET` | `/api/auth/me` | Returns current user info |

### Trackers

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/trackers` | List all trackers |
| `POST` | `/api/trackers` | Create a tracker |
| `GET` | `/api/trackers/:id` | Get a tracker |
| `PUT` | `/api/trackers/:id` | Update a tracker |
| `DELETE` | `/api/trackers/:id` | Delete a tracker (cascades entries) |
| `GET` | `/api/trackers/:id/entries` | List entries. Optional: `?days=90` |
| `POST` | `/api/trackers/:id/entries` | Log an entry: `{ value, notes, logged_at }` |
| `PUT` | `/api/entries/:id` | Edit an entry |
| `DELETE` | `/api/entries/:id` | Delete an entry |

### Crafts

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/crafts` | List crafts. Optional: `?status=wishlist\|in_progress\|completed` |
| `POST` | `/api/crafts` | Create craft (multipart/form-data, supports image uploads) |
| `GET` | `/api/crafts/:id` | Get a craft with tags + images |
| `PUT` | `/api/crafts/:id` | Update craft |
| `DELETE` | `/api/crafts/:id` | Delete craft |
| `POST` | `/api/crafts/:id/images` | Upload images to a craft |
| `DELETE` | `/api/craft-images/:id` | Delete a craft image |

### Materials & Contacts

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/materials` | List materials |
| `POST` | `/api/materials` | Create material |
| `PUT` | `/api/materials/:id` | Update material |
| `DELETE` | `/api/materials/:id` | Delete material |
| `GET` | `/api/contacts` | List contacts |
| `POST` | `/api/contacts` | Create contact |
| `PUT` | `/api/contacts/:id` | Update contact |
| `DELETE` | `/api/contacts/:id` | Delete contact |

### AI & Push

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/ai/correlation-insight` | `{ trackerIds: [], days: 60 }` → AI pattern insight |
| `POST` | `/api/ai/craft-suggestions` | `{ contactId, occasion }` → 3 AI gift craft ideas |
| `POST` | `/api/push/subscribe` | Register a push subscription |
| `POST` | `/api/push/unsubscribe` | Remove a push subscription |
| `POST` | `/api/push/test` | Send a test push notification |
| `GET` | `/api/og?url=...` | Scrape Open Graph metadata from a URL |

### Utilities

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (no auth). Returns `{ status, env, db }` |

---

## Project Structure

```
/
├── client/                        # Vite React PWA
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.js             # Axios instance with JWT headers + 401 redirect
│   │   │   └── streak.js          # Streak calculation + milestone helpers
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   └── Modal.jsx      # Reusable bottom-sheet modal
│   │   │   ├── tracker/
│   │   │   │   ├── TrackerCard.jsx
│   │   │   │   ├── HeatmapCalendar.jsx
│   │   │   │   ├── CreateTrackerModal.jsx
│   │   │   │   └── LogEntryModal.jsx
│   │   │   ├── crafts/
│   │   │   │   ├── CraftCard.jsx
│   │   │   │   └── CreateCraftModal.jsx
│   │   │   └── dashboard/
│   │   │       └── QuickLogCard.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Trackers.jsx
│   │   │   ├── TrackerDetail.jsx
│   │   │   ├── Crafts.jsx
│   │   │   └── Settings.jsx       # stub — full build in step 13
│   │   └── styles/
│   │       └── globals.css        # Design system CSS variables
│   └── vite.config.js             # PWA manifest + service worker + dev proxy
├── server/
│   ├── index.js                   # Express entry point, static file serving
│   ├── db.js                      # SQLite init, full schema, seed data
│   ├── middleware/
│   │   └── auth.js                # JWT requireAuth middleware
│   ├── routes/
│   │   ├── auth.js                # login + /me
│   │   ├── trackers.js            # CRUD + entries
│   │   ├── entries.js             # edit + delete entries
│   │   ├── crafts.js              # CRUD + image upload (multer)
│   │   ├── craftImages.js         # delete craft images
│   │   ├── materials.js           # CRUD
│   │   ├── contacts.js            # CRUD
│   │   ├── push.js                # subscribe/unsubscribe/test + sendTrackerReminders()
│   │   ├── ai.js                  # OpenRouter: correlation insight + craft suggestions
│   │   └── og.js                  # Open Graph URL scraper
│   └── jobs/
│       └── notifications.js       # node-cron: fires per-minute, delivers push reminders
├── scripts/
│   ├── create-user.js             # CLI: node scripts/create-user.js <user> <pass>
│   └── generate-vapid-keys.js     # prints VAPID keys to paste into Railway
├── .env.example
├── nixpacks.toml                  # Railway build + start config
└── package.json
```

---

## Design Notes

**Fonts** (loaded from Google Fonts):
- `Syne` weight 800 — display text, headers, the logo
- `IBM Plex Mono` — all UI labels, numbers, metadata

**Color palette:**
```
--bg:           #0d0d0d   (near-black base)
--surface:      #1a1a1a   (cards, modals)
--surface-2:    #242424   (inputs, secondary surfaces)
--text:         #f0ece0   (warm off-white)
--text-muted:   #7a7570
--accent-coral: #ff6b4a
--accent-lime:  #c8f135
--accent-blue:  #4af0e4
--border:       #2e2e2e
```

The aesthetic is intentionally handmade-zine: chunky streak numbers, sticker-like tracker cards with colored left-edge accents, slide-up modals, bounce animations on entry.
