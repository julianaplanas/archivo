import React from 'react';
import { isLoggedToday, computeStreak } from '../../lib/streak';
import './QuickLogCard.css';

export default function QuickLogCard({ tracker, entries = [], onTap }) {
  const logged = isLoggedToday(entries);
  const streak = computeStreak(entries, tracker);

  return (
    <button
      className={`qlc ${logged ? 'logged' : ''}`}
      style={{ '--accent': tracker.color }}
      onClick={() => onTap(tracker)}
      aria-label={`${tracker.name} — ${logged ? 'logged today' : 'tap to log'}`}
    >
      <div className="qlc-top">
        {logged && <span className="qlc-check">✓</span>}
        <span className="qlc-streak">{streak}</span>
      </div>
      <span className="qlc-emoji">{tracker.emoji}</span>
      <span className="qlc-name">{tracker.name}</span>
    </button>
  );
}
