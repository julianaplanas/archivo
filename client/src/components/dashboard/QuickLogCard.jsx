import React from 'react';
import { startOfDay, parseISO } from 'date-fns';
import { isLoggedToday } from '../../lib/streak';
import './QuickLogCard.css';

function getTodayCount(entries, tracker) {
  const today = startOfDay(new Date()).toDateString();
  const todayEntries = entries.filter(e => startOfDay(parseISO(e.logged_at)).toDateString() === today);
  if (!todayEntries.length) return null;
  if (tracker.type === 'quantity') {
    return todayEntries.reduce((sum, e) => sum + (parseFloat(e.value) || 0), 0);
  }
  return todayEntries.length;
}

export default function QuickLogCard({ tracker, entries = [], onTap }) {
  const logged = isLoggedToday(entries);
  const todayCount = getTodayCount(entries, tracker);

  return (
    <button
      className={`qlc ${logged ? 'logged' : ''}`}
      style={{ '--accent': tracker.color }}
      onClick={() => onTap(tracker)}
      aria-label={`${tracker.name} — ${logged ? 'logged today' : 'tap to log'}`}
    >
      <div className="qlc-top">
        {logged && <span className="qlc-check">✓</span>}
        {todayCount !== null && <span className="qlc-streak">{todayCount}</span>}
      </div>
      <span className="qlc-emoji">{tracker.emoji}</span>
      <span className="qlc-name">{tracker.name}</span>
    </button>
  );
}
