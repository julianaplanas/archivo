import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInCalendarDays, startOfDay, formatDistanceToNow, addDays } from 'date-fns';
import { computeStreak, isLoggedToday, getMilestone } from '../lib/streak';
import QuickLogCard from '../components/dashboard/QuickLogCard';
import LogEntryModal from '../components/tracker/LogEntryModal';
import api from '../lib/api';
import './Dashboard.css';

function buildMonthlyRecap(trackers, entriesMap45, crafts) {
  const now = new Date();
  const lmYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lmMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const daysInLm = new Date(lmYear, lmMonth + 1, 0).getDate();

  const trackerStats = trackers.map(t => {
    const entries = (entriesMap45[t.id] || []).filter(e => {
      const d = parseISO(e.logged_at);
      return d.getFullYear() === lmYear && d.getMonth() === lmMonth;
    });
    const uniqueDays = new Set(entries.map(e => parseISO(e.logged_at).getDate())).size;
    const pct = Math.round((uniqueDays / daysInLm) * 100);
    return { tracker: t, uniqueDays, pct };
  }).filter(s => s.uniqueDays > 0);

  const lmName = new Date(lmYear, lmMonth).toLocaleString('default', { month: 'long' });

  const completedCrafts = crafts.filter(c => {
    if (c.status !== 'completed') return false;
    const d = parseISO(c.completed_at || c.created_at);
    return d.getFullYear() === lmYear && d.getMonth() === lmMonth;
  });

  const wishlistCrafts = crafts.filter(c => c.status === 'wishlist');

  return { trackerStats, lmName, completedCrafts, wishlistCrafts, daysInLm };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'still up? ✦';
  if (h < 12) return 'good morning ✦';
  if (h < 17) return 'hey there ✦';
  if (h < 21) return 'good evening ✦';
  return 'night owl ✦';
}

function getUpcomingBirthdays(contacts, days = 30) {
  const now = startOfDay(new Date());
  const year = now.getFullYear();
  return contacts
    .filter(c => c.birthday)
    .map(c => {
      const b = parseISO(c.birthday);
      let next = new Date(year, b.getMonth(), b.getDate());
      if (next < now) next = new Date(year + 1, b.getMonth(), b.getDate());
      return { ...c, daysUntil: differenceInCalendarDays(next, now), nextDate: next };
    })
    .filter(c => c.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function generateMiniStat(trackers, entriesMap) {
  if (!trackers.length) return null;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  for (const t of trackers) {
    const entries = entriesMap[t.id] || [];
    const milestone = getMilestone(computeStreak(entries, t));
    if (milestone) return { emoji: '🎉', text: `${t.emoji} ${t.name} just hit a ${milestone}-day milestone!` };
  }
  for (const t of trackers.filter(t => t.mode === 'quit')) {
    const weekEntries = (entriesMap[t.id] || []).filter(e => parseISO(e.logged_at) >= weekAgo);
    if (weekEntries.length === 0) return { emoji: '✨', text: `zero ${t.name.toLowerCase()} days this week — clean streak going strong ${t.emoji}` };
  }
  for (const t of trackers.filter(t => t.mode === 'do_it')) {
    const entries = entriesMap[t.id] || [];
    const weekEntries = entries.filter(e => parseISO(e.logged_at) >= weekAgo);
    const uniqueDays = new Set(weekEntries.map(e => startOfDay(parseISO(e.logged_at)).toDateString())).size;
    if (uniqueDays >= 5) return { emoji: '🔥', text: `${t.emoji} ${t.name} ${uniqueDays}/7 days this week — on a roll` };
  }
  const loggedCount = trackers.filter(t => isLoggedToday(entriesMap[t.id] || [])).length;
  if (loggedCount > 0) return { emoji: '👀', text: `${loggedCount} of ${trackers.length} tracker${trackers.length !== 1 ? 's' : ''} logged today` };
  return null;
}

function buildFeed(trackers, entriesMap, crafts) {
  const trackerMap = Object.fromEntries(trackers.map(t => [t.id, t]));
  const items = [];

  // Recent tracker entries (last 7 days)
  const cutoff = Date.now() - 7 * 86_400_000;
  for (const [trackerId, entries] of Object.entries(entriesMap)) {
    const tracker = trackerMap[trackerId];
    if (!tracker) continue;
    for (const entry of entries) {
      if (new Date(entry.logged_at) >= cutoff) {
        items.push({ type: 'entry', entry, tracker, date: entry.logged_at });
      }
    }
  }

  // Recent crafts (last 14 days)
  for (const craft of crafts) {
    if (new Date(craft.created_at) >= Date.now() - 14 * 86_400_000) {
      items.push({ type: 'craft', craft, date: craft.created_at });
    }
  }

  return items
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);
}

function formatEntryValue(entry, tracker) {
  if (!tracker) return entry.value;
  const subtype = tracker.tracker_subtype;
  if (subtype === 'menstruation') {
    const labels = { '1': 'spotting', '2': 'light', '3': 'medium', '4': 'heavy' };
    return labels[entry.value] ?? entry.value;
  }
  if (tracker.type === 'boolean') return entry.value === '1' ? 'logged ✓' : 'skipped';
  if (tracker.type === 'scale') {
    const max = tracker.tracker_subtype === 'poop' ? 7 : 10;
    return `${entry.value}/${max}`;
  }
  return entry.value || '—';
}

// ─── component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [trackers, setTrackers] = useState([]);
  const [entriesMap, setEntriesMap] = useState({});
  const [contacts, setContacts] = useState([]);
  const [crafts, setCrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logTarget, setLogTarget] = useState(null);
  const [entriesMap45, setEntriesMap45] = useState({});

  const today = new Date();
  const dayOfMonth = today.getDate();
  const showRecap = dayOfMonth >= 1 && dayOfMonth <= 5;

  const loadData = useCallback(async () => {
    const [{ data: ts }, { data: cs }, { data: cr }] = await Promise.all([
      api.get('/trackers'),
      api.get('/contacts'),
      api.get('/crafts'),
    ]);
    setTrackers(ts);
    setContacts(cs);
    setCrafts(cr);

    const results = await Promise.all(
      ts.map(t => api.get(`/trackers/${t.id}/entries?days=14`).then(r => [t.id, r.data]))
    );
    setEntriesMap(Object.fromEntries(results));

    // Load 45-day window for monthly recap (only on days 1-5)
    if (dayOfMonth >= 1 && dayOfMonth <= 5) {
      const results45 = await Promise.all(
        ts.map(t => api.get(`/trackers/${t.id}/entries?days=45`).then(r => [t.id, r.data]))
      );
      setEntriesMap45(Object.fromEntries(results45));
    }

    setLoading(false);
  }, [dayOfMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleQuickLog(tracker) {
    setLogTarget(tracker);
  }

  async function handleLog(tracker, entryData) {
    await api.post(`/trackers/${tracker.id}/entries`, entryData);
    const { data } = await api.get(`/trackers/${tracker.id}/entries?days=14`);
    setEntriesMap(m => ({ ...m, [tracker.id]: data }));
  }

  const dateStr = format(new Date(), "EEEE, do 'of' MMMM").toLowerCase();
  const birthdays = getUpcomingBirthdays(contacts);
  const miniStat = generateMiniStat(trackers, entriesMap);
  const feed = buildFeed(trackers, entriesMap, crafts);
  const hasAnyData = trackers.length > 0 || crafts.length > 0;

  return (
    <div className="page">
      <div className="page-content">

        {/* Greeting */}
        <div className="dash-date">{dateStr}</div>
        <h1 className="dash-greeting">{getGreeting()}</h1>

        {/* Quick-log strip */}
        <section className="dash-section">
          <div className="section-label">today</div>

          {loading ? (
            <div className="qlc-strip">
              {[1, 2, 3].map(i => <div key={i} className="qlc-skeleton" />)}
            </div>
          ) : trackers.length === 0 ? (
            <div className="dash-empty" onClick={() => navigate('/trackers')}>
              <span className="dash-empty-art">[ + ]</span>
              <span>create your first tracker →</span>
            </div>
          ) : (
            <div className="qlc-strip">
              {trackers.map((t, i) => (
                <QuickLogCard
                  key={t.id}
                  tracker={t}
                  entries={entriesMap[t.id] || []}
                  onTap={handleQuickLog}
                  style={{ animationDelay: `${i * 0.06}s` }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Today at a glance */}
        {!loading && trackers.length > 0 && (
          <div className="glance-strip">
            {trackers.map(t => {
              const logged = isLoggedToday(entriesMap[t.id] || []);
              const streak = computeStreak(entriesMap[t.id] || [], t);
              return (
                <div
                  key={t.id}
                  className={`glance-chip ${logged ? 'logged' : ''}`}
                  style={{ '--accent': t.color }}
                  onClick={() => navigate(`/trackers/${t.id}`)}
                >
                  <span>{t.emoji}</span>
                  <span className="glance-chip-name">{t.name}</span>
                  {streak > 0 && <span className="glance-chip-streak">{streak}d</span>}
                  <span className="glance-chip-dot" />
                </div>
              );
            })}
          </div>
        )}

        {/* Mini stat */}
        {!loading && miniStat && (
          <div className="mini-stat">
            <span className="mini-stat-emoji">{miniStat.emoji}</span>
            <span className="mini-stat-text">{miniStat.text}</span>
          </div>
        )}

        {/* Upcoming birthdays */}
        {birthdays.length > 0 && (
          <section className="dash-section">
            <div className="section-label">upcoming birthdays</div>
            <div className="birthday-list">
              {birthdays.map(c => (
                <div key={c.id} className="birthday-row">
                  <div className="birthday-info">
                    <span className="birthday-name">{c.name}</span>
                    <span className="birthday-date">{format(c.nextDate, 'MMM d')}</span>
                  </div>
                  <div className="birthday-right">
                    <span className={`birthday-countdown ${c.daysUntil === 0 ? 'today' : c.daysUntil <= 7 ? 'soon' : ''}`}>
                      {c.daysUntil === 0 ? '🎂 today!' : c.daysUntil === 1 ? 'tomorrow' : `in ${c.daysUntil}d`}
                    </span>
                    <button className="btn btn-ghost craft-ideas-btn" onClick={() => navigate('/crafts')}>
                      craft ideas ✨
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming craft deadlines */}
        {!loading && (() => {
          const upcoming = crafts
            .filter(c => c.deadline_date && c.status !== 'completed')
            .map(c => ({ ...c, daysLeft: differenceInCalendarDays(parseISO(c.deadline_date), new Date()) }))
            .filter(c => c.daysLeft <= 30)
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, 5);
          if (!upcoming.length) return null;
          return (
            <section className="dash-section">
              <div className="section-label">upcoming deadlines</div>
              <div className="birthday-list">
                {upcoming.map(c => (
                  <div key={c.id} className="birthday-row">
                    <div className="birthday-info">
                      <span className="birthday-name">✂️ {c.title}</span>
                      {c.deadline_label && <span className="birthday-date">{c.deadline_label}</span>}
                    </div>
                    <span className={`birthday-countdown ${c.daysLeft <= 0 ? 'today' : c.daysLeft <= 7 ? 'soon' : ''}`}>
                      {c.daysLeft < 0 ? 'overdue' : c.daysLeft === 0 ? '🗓 today!' : `in ${c.daysLeft}d`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Monthly recap card */}
        {!loading && showRecap && (() => {
          const recap = buildMonthlyRecap(trackers, entriesMap45, crafts);
          if (!recap.trackerStats.length && !recap.completedCrafts.length) return null;
          return (
            <section className="dash-section">
              <div className="section-label">📅 {recap.lmName} recap</div>
              <div className="recap-card">
                {recap.trackerStats.length > 0 && (
                  <div className="recap-trackers">
                    {recap.trackerStats.map(({ tracker, uniqueDays, pct }) => (
                      <div key={tracker.id} className="recap-tracker-row">
                        <span className="recap-tracker-emoji">{tracker.emoji}</span>
                        <span className="recap-tracker-name">{tracker.name}</span>
                        <span className="recap-tracker-stat">{uniqueDays}/{recap.daysInLm}d · {pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {recap.completedCrafts.length > 0 && (
                  <div className="recap-crafts">
                    <div className="recap-section-label">completed crafts</div>
                    {recap.completedCrafts.map(c => (
                      <div key={c.id} className="recap-craft-row">✂️ {c.title}</div>
                    ))}
                  </div>
                )}
                {recap.wishlistCrafts.length > 0 && (
                  <div className="recap-crafts">
                    <div className="recap-section-label">still on the wishlist</div>
                    {recap.wishlistCrafts.slice(0, 3).map(c => (
                      <div key={c.id} className="recap-craft-row">
                        ★ {c.title}
                        {c.materials?.some(m => m.status === 'need') && (
                          <span className="recap-buy-hint"> · 🛒 {c.materials.filter(m => m.status === 'need').length} to buy</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* Activity feed */}
        {!loading && (
          <section className="dash-section">
            <div className="section-label">recent activity</div>
            {!hasAnyData ? (
              <div className="feed-empty">
                <span className="feed-empty-art">[ nothing yet ]</span>
                <span className="feed-empty-sub">start adding things — your activity will show up here ↑</span>
              </div>
            ) : feed.length === 0 ? (
              <div className="feed-empty">
                <span className="feed-empty-art">[ quiet week ]</span>
                <span className="feed-empty-sub">log a tracker or add a craft to see activity here</span>
              </div>
            ) : (
              <div className="feed-list">
                {feed.map((item, i) => (
                  <div key={i} className="feed-item">
                    {item.type === 'entry' ? (
                      <>
                        <span className="feed-icon">{item.tracker.emoji}</span>
                        <div className="feed-content">
                          <span className="feed-label">
                            {item.tracker.name} — <span className="feed-value">{formatEntryValue(item.entry, item.tracker)}</span>
                            {item.entry.notes && <span className="feed-notes"> · {item.entry.notes}</span>}
                          </span>
                          <span className="feed-time">{formatDistanceToNow(parseISO(item.date), { addSuffix: true })}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="feed-icon">✂️</span>
                        <div className="feed-content">
                          <span className="feed-label">added <span className="feed-value">{item.craft.title}</span> to crafts</span>
                          <span className="feed-time">{formatDistanceToNow(parseISO(item.date), { addSuffix: true })}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </div>

      {logTarget && (
        <LogEntryModal
          tracker={logTarget}
          onLog={(data) => handleLog(logTarget, data)}
          onClose={() => setLogTarget(null)}
        />
      )}
    </div>
  );
}
