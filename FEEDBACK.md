# Archivo — Feedback Round 1

---

## 🎨 Design

**Colors**
- Shift the accent palette from neon to primary. Replace the current coral/lime/electric-blue with more grounded primaries: a warm red, a true blue, a yellow. Same energy, less aggressive on the eyes.

**Updated CSS variables suggestion:**
```css
--accent-red:    #d93f2e;
--accent-blue:   #2563eb;
--accent-yellow: #f5c400;
```

---

## 📐 Layout & Spacing

**Top margin — date hidden by phone UI**
- The date at the top is being covered by the phone's status bar / dynamic island. Add enough top padding/margin (at minimum `env(safe-area-inset-top)` + extra breathing room) so content is never obscured.

**Bottom nav — emoji alignment**
- The emojis in the bottom tab bar are sitting on top of the divider line instead of below it. Fix the padding so the nav content sits cleanly inside the nav area, with the border above it.

**Input zoom on mobile**
- Tapping any input field triggers an unwanted browser zoom, making the app look broken. Fix by setting `font-size: 16px` minimum on all `<input>` and `<textarea>` elements — iOS zooms in whenever font-size is below 16px.

---

## 📊 Trackers

**Onboarding flow — tracker selection before setup**
- Before showing the tracker dashboard, new users should go through a picker: "what do you want to track?" — show a curated list of presets (gym, meds, sugar, poop, menstruation, etc.) plus an "add custom" option. Only after selecting does the setup form appear.

**Multiple entries per day**
- Some trackers need to support more than one log per day. Examples: meds (once or twice daily), sugar (multiple consumptions), poop. The tracker setup form should include a field: *"How many times per day?"* (once / multiple). This also affects notifications — if a tracker allows multiple daily entries, the user should be able to set multiple notification times.

**Deselecting / toggling off a log**
- Once something like gym is logged as done, there's no way to undo it. Tapping a logged entry should toggle it off (with a confirmation if needed). This is especially important for boolean trackers.

**Data persistence across deploys**
- Confirm that all tracker entries are being saved to the SQLite database on the Railway Volume (`/data/archivo.db`) and not in memory or a local file outside the volume. Data must survive redeployments. Add a visible note in the settings screen: *"Data stored on Railway Volume — survives redeployments."*

---

## ✂️ Crafts

**Single list with filters instead of two tabs**
- Remove the Wishlist / Completed split tabs. Replace with a single unified craft list and a filter/tag system. "Completed" becomes a label (like a tag or status badge), not a separate section or date field.

**Completed = a label, not a date**
- Marking a craft as completed should just apply a "completed ✓" label/badge to the card. No date picker, no separate completed-on field. Keep it simple.

**Link crafts to people / birthdays**
- Add a "for someone?" field directly on the craft add/edit form (not buried in a separate contacts section). User can type or select a person's name and optionally a date/occasion (birthday, holiday, etc.). This connection should be visible on the craft card and searchable/filterable.

---

## 🔧 Notes for Implementation

- The input zoom fix (`font-size: 16px`) is a one-line CSS rule but easy to miss — add it to the global stylesheet and double-check every form in the app
- The tracker multi-entry change requires a schema update: add a `max_entries_per_day` field to the `trackers` table and a `notification_times` field (JSON array of times) to replace the single notification time