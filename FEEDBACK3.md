# Archivo — Feedback Round 3

---

## 🏠 Dashboard / Feed

**Tracker cards — tap to log, not auto-log**
- Emoji cards on the feed should NOT auto-log on tap. Tapping a tracker card opens the log form for that tracker (the personalized form per type defined in Round 2). Only submitting the form creates an entry.

**Keep these elements from current dashboard:**
- Daily progress message: "X of Y trackers logged today" — keep as-is
- Recent activity feed — keep as-is

**New: Monthly recap card in the feed**
- On the last day of each month, generate and show a monthly recap card in the feed
- This card persists in the feed for the first 5 days of the following month, then disappears
- The card should include:
  - Tracker stats: summary per tracker (days logged, streaks, notable patterns)
  - Crafts completed that month
  - Crafts on the wishlist planned for next month + materials needed to buy for them
- Implementation: on app load, check if today is between the 1st and 5th of the month — if so, fetch last month's data and render the recap card at the top of the feed
- This card should also be triggerable as a push notification on the last day of the month (add a monthly cron job for this)

---

## 📊 Trackers

**New shared calendar view**
- Add a unified calendar view at the top of the Trackers section (before the individual tracker list)
- Each day on the calendar shows colored dots — one dot per tracker that was logged that day, using each tracker's assigned color
- Tapping a day shows a summary of what was logged that day across all trackers

**Bug: Poop tracker scale showing wrong range**
- The poop tracker uses a Bristol scale of 1–7, but entries are being displayed as 1/10. Fix the scale to display correctly as X/7 everywhere: on the log form, in the entry history, and on the heatmap

---

## ✂️ Crafts

**URL fetch — clarify and fix behavior**
- When the user taps "fetch" on a URL, it should visibly attempt to retrieve the page's OG title and OG image, then auto-fill the craft title and add the image to the craft. Show a loading indicator while fetching. Show a clear error message if it fails (e.g. "couldn't fetch that URL — you can still save it manually")
- Support multiple URLs per craft — show a list of saved URLs, each with a small favicon or domain label, with an option to add more or remove individual ones
- URLs should appear at the bottom of the craft detail view, below photos

**Input zoom bug — tags field**
- The "add tags" input still triggers iOS zoom. Apply the `font-size: 16px` fix to this field specifically (it was missed in the previous pass). Audit ALL inputs in the crafts section for the same issue.

**Craft detail — read mode**
- Tapping a craft card should open a read-only detail view showing all information: title, status label, tags, images, URLs, materials, timeline, people linked
- Edit mode should only activate when the user explicitly taps an "edit" button
- Do not open edit mode by default on craft tap

**Craft timeline**
- Add an optional timeline / deadline field to crafts: a date with an optional label (e.g. "Ana's birthday", "Christmas gift")
- Show this prominently on the craft card if set — e.g. "🗓 due in 12 days"
- Upcoming deadlines should surface in the home feed

**Materials inside a craft**
- When adding or editing a craft, include an optional "materials needed" section
- Each material entry: name, quantity, unit
- Each material can be marked as: ✅ have it / 🛒 need to buy
- "Need to buy" materials should feed into the global shopping list view (see below)

**Tag search / filter**
- Add a tag filter bar at the top of the crafts list — shows all tags in use as tappable chips
- Tapping a tag filters the list to only crafts with that tag; tapping again deselects
- Multiple tags can be active at once (AND or OR logic — OR is more forgiving, prefer that)
- A text search input above the chips should also filter by craft title in real time
- No new API route needed — filter on the frontend from the full crafts list, or add `?tag=` query param support to `GET /api/crafts` if the list gets long

---

**New: Shopping list view inside Crafts section**
- Add a dedicated view within the Crafts section: "🛒 To Buy"
- Shows a consolidated list of all materials marked as "need to buy" across all crafts
- Each item shows: material name, quantity, unit, and which craft(s) it belongs to
- Allow marking items as purchased (removes from list or strikes through)

---

## 📐 General / UX

**Top margin on modals and forms**
- All bottom sheets, modals, and full-screen forms need significantly more top margin/padding so the close button or top edge of the card is reachable and not clipped by the phone's status bar or dynamic island
- Use `env(safe-area-inset-top)` plus at least 16px additional padding consistently across all overlays

---

## 📚 New Feature: Books Tracker

Add a new main tab: **📚 Books**

### Views
- **Read** — books finished, with rating and comment
- **Want to read** — reading wishlist
- Single unified list with a status filter (same pattern as crafts after Round 2 fix)

### Book entry fields
- Title (with autocomplete — see below)
- Author (with autocomplete)
- Status: "read" | "want to read" | "reading"
- Rating: 1–5 stars (only for "read" books)
- Comment / notes (free text)
- Date finished (optional, only for "read")

### Autocomplete via AI
- As the user types a book title or author, call the backend which calls Claude with a prompt like: *"The user is typing a book title: '[input]'. Suggest 4 possible book matches as JSON: [{title, author, year}]. Return only JSON."*
- Debounce the input (wait 400ms after last keystroke before calling)
- Show suggestions as a dropdown below the input — tap to auto-fill both title and author fields
- This avoids needing a third-party books API and keeps it within the existing AI setup

### Design
- Book cards should feel like little library cards or paperback spines — play with the aesthetic here
- Star rating should be tappable, not a slider or number input
- Empty state for "want to read": *"what's next on the pile? →"*

### Schema additions
```sql
books (
  id, 
  title, 
  author, 
  status,        -- 'read' | 'want_to_read' | 'reading'
  rating,        -- 1–5, nullable
  comment,       -- text, nullable
  date_finished, -- nullable
  created_at
)
```

### API routes to add
```
GET    /api/books
POST   /api/books
GET    /api/books/:id
PUT    /api/books/:id
DELETE /api/books/:id
POST   /api/ai/book-autocomplete   -- body: { query: string }
```