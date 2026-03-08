# Archivo — Feedback Round 2

---

## 🗑️ Deletions & Confirmations

**Replace system dialogs with in-app modals**
- Any delete action (tracker, entry, craft, material) must use a custom in-app confirmation modal — not `window.confirm()` or browser native dialogs. The modal should match the app's aesthetic: dark background, chunky button, brief warning text. Two actions only: "delete" (destructive, accent-red) and "cancel".

---

## 🏠 Home Page

**Feed / resume instead of empty dashboard**
- The home page should show a unified feed of activity across all sections — trackers and crafts for now, extensible later. Think of it as a personal timeline. Suggested layout:
  - Today's tracker status at the top (quick-log strip, already exists — keep it)
  - Below that: a reverse-chronological feed of recent activity — last logs, recently added crafts, streaks worth celebrating, upcoming birthdays
  - Empty state: a warm "nothing yet — start adding things!" prompt, not a blank screen

---

## ✨ Empty State — No Trackers

**Remove pre-seeded trackers**
- Do not seed any default trackers. On first open, if the user has no trackers, show a friendly empty state message instead — something like: *"what do you want to track? →"* with a clear CTA to add the first one. Playful tone, fits the zine aesthetic.

---

## 🔔 Notifications — 10am Not Firing

**Bug: scheduled notifications not being sent**
- The test notification works (push subscription is valid) but the cron job at 10am did not fire. Things to investigate and fix:
  - Confirm the cron job is running in the correct timezone — Railway servers run in UTC, so `0 10 * * *` fires at 10am UTC, not local time. The cron schedule needs to account for the user's timezone, or store a UTC offset with the notification preference.
  - Add server-side logging for every cron tick: `"[cron] checking notifications — HH:MM UTC"` so it's visible in Railway logs
  - Add logging for each notification dispatched: `"[push] sent to <endpoint> for tracker <name>"`
  - Consider storing notification time as UTC in the DB at save time (convert from user's local time on the frontend before sending to the API)

---

## 📋 Tracker Forms — Personalized per Type

Each tracker preset should have a tailored entry form and logging experience. Do not use a generic form for all types.

**💩 Poop**
- Can be logged multiple times a day (no limit)
- Entry form: just a quick-log button — one tap = one entry. Optionally add a Bristol stool scale selector (1–7) as a fun extra field, presented with small illustrated icons or emoji
- No daily goal pressure, mode should default to "just tracking"

**🩸 Menstruation**
- Occurs a few days per month, not daily
- Entry form fields: flow intensity (spotting / light / medium / heavy) as a visual selector (not a dropdown), optional notes
- Calendar heatmap should use color intensity to show flow level, not just presence
- Cycle tracking: show average cycle length on the tracker detail page if enough data exists

**💪 Gym**
- Once per day maximum
- Entry form fields: did you go? (boolean toggle) + type of training (strength / cardio / yoga / climbing / other — shown as tappable chips, multi-select allowed)
- Streak counter is the hero metric here

**💊 Daily Meds**
- Configured as 2x per week (not daily) — the frequency setting must be respected in streak logic (a "streak" here means not missing a scheduled day, not a daily streak)
- Entry form: simple checkbox "took it" — no extra fields needed
- If multiple times per day is configured, show one checkbox per dose with a time label

**🍬 Sugar**
- Multiple entries per day allowed
- Entry form: quick-log with optional notes (e.g. "birthday cake", "coffee with sugar")
- In "I want to quit" mode, each entry is a relapse log — show cumulative count per day on the heatmap

**General rule for all custom/future trackers:**
- The tracker setup form should ask: *how often do you expect to log this?* (once a day / multiple times a day / a few times a week / a few times a month)
- This setting controls: whether multiple entries per day are allowed, how streak logic works, and how many notification times can be set

---

## 🔧 Schema Changes Required

```sql
-- Add to trackers table:
frequency       TEXT  -- 'daily_once' | 'daily_multiple' | 'weekly' | 'monthly'
notification_times  TEXT  -- JSON array of UTC time strings e.g. ["08:00", "20:00"]
tracker_subtype TEXT  -- 'poop' | 'menstruation' | 'gym' | 'meds' | 'sugar' | 'custom'

-- Add to tracker_entries table:
entry_metadata  TEXT  -- JSON blob for subtype-specific fields
                      -- e.g. gym: {"training_type": ["strength","cardio"]}
                      -- e.g. menstruation: {"flow": "heavy"}
                      -- e.g. poop: {"bristol_scale": 4}
```