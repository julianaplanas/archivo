import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInCalendarDays, startOfDay } from 'date-fns';
import { computeStreak, isLoggedToday, getMilestone } from '../lib/streak';
import QuickLogCard from '../components/dashboard/QuickLogCard';
import LogEntryModal from '../components/tracker/LogEntryModal';
import api from '../lib/api';
import './Dashboard.css';

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

  // 1. Streak milestones (highest priority)
  for (const t of trackers) {
    const entries = entriesMap[t.id] || [];
    const milestone = getMilestone(computeStreak(entries, t));
    if (milestone) {
      return { emoji: '🎉', text: `${t.emoji} ${t.name} just hit a ${milestone}-day milestone!` };
    }
  }

  // 2. Quit-mode tracker with clean week
  for (const t of trackers.filter(t => t.mode === 'quit')) {
    const weekEntries = (entriesMap[t.id] || []).filter(e => parseISO(e.logged_at) >= weekAgo);
    if (weekEntries.length === 0) {
      return { emoji: '✨', text: `zero ${t.name.toLowerCase()} days this week — clean streak going strong ${t.emoji}` };
    }
  }

  // 3. Do-it tracker crushing it this week (5+ days)
  for (const t of trackers.filter(t => t.mode === 'do_it')) {
    const entries = entriesMap[t.id] || [];
    const weekEntries = entries.filter(e => parseISO(e.logged_at) >= weekAgo);
    const uniqueDays = new Set(weekEntries.map(e => startOfDay(parseISO(e.logged_at)).toDateString())).size;
    if (uniqueDays >= 5) {
      return { emoji: '🔥', text: `${t.emoji} ${t.name} ${uniqueDays}/7 days this week — on a roll` };
    }
  }

  // 4. Something logged today at all
  const loggedCount = trackers.filter(t => isLoggedToday(entriesMap[t.id] || [])).length;
  if (loggedCount > 0) {
    return {
      emoji: '👀',
      text: `${loggedCount} of ${trackers.length} tracker${trackers.length !== 1 ? 's' : ''} logged today`,
    };
  }

  return null;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [trackers, setTrackers] = useState([]);
  const [entriesMap, setEntriesMap] = useState({});
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logTarget, setLogTarget] = useState(null);

  const loadData = useCallback(async () => {
    const [{ data: ts }, { data: cs }] = await Promise.all([
      api.get('/trackers'),
      api.get('/contacts'),
    ]);
    setTrackers(ts);
    setContacts(cs);

    const results = await Promise.all(
      ts.map(t => api.get(`/trackers/${t.id}/entries?days=90`).then(r => [t.id, r.data]))
    );
    setEntriesMap(Object.fromEntries(results));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleQuickLog(tracker) {
    if (tracker.type === 'boolean') {
      await api.post(`/trackers/${tracker.id}/entries`, { value: '1' });
      const { data } = await api.get(`/trackers/${tracker.id}/entries?days=90`);
      setEntriesMap(m => ({ ...m, [tracker.id]: data }));
    } else {
      setLogTarget(tracker);
    }
  }

  async function handleLog(tracker, entryData) {
    await api.post(`/trackers/${tracker.id}/entries`, entryData);
    const { data } = await api.get(`/trackers/${tracker.id}/entries?days=90`);
    setEntriesMap(m => ({ ...m, [tracker.id]: data }));
  }

  const dateStr = format(new Date(), "EEEE, do 'of' MMMM").toLowerCase();
  const birthdays = getUpcomingBirthdays(contacts);
  const miniStat = generateMiniStat(trackers, entriesMap);

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

        {/* Today at a glance — logged status chips */}
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
                    <span className="birthday-date">
                      {format(c.nextDate, 'MMM d')}
                    </span>
                  </div>
                  <div className="birthday-right">
                    <span className={`birthday-countdown ${c.daysUntil === 0 ? 'today' : c.daysUntil <= 7 ? 'soon' : ''}`}>
                      {c.daysUntil === 0 ? '🎂 today!' : c.daysUntil === 1 ? 'tomorrow' : `in ${c.daysUntil}d`}
                    </span>
                    <button
                      className="btn btn-ghost craft-ideas-btn"
                      onClick={() => navigate('/crafts')}
                    >
                      get craft ideas ✨
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
