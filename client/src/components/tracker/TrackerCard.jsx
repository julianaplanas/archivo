import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedToday, computeStreak } from '../../lib/streak';
import './TrackerCard.css';

const MODE_LABELS = {
  quit: '🚫 quit',
  do_it: '✅ do it',
  track_only: '👁 tracking',
};

const STREAK_LABELS = {
  quit: 'days clean',
  do_it: 'day streak',
  track_only: 'day streak',
};

export default function TrackerCard({ tracker, entries = [], onQuickLog }) {
  const navigate = useNavigate();
  const logged = isLoggedToday(entries);
  const streak = computeStreak(entries, tracker);

  function handleLog(e) {
    e.stopPropagation();
    onQuickLog(tracker, tracker.type === 'boolean' ? 'immediate' : 'modal');
  }

  return (
    <div
      className={`tracker-card ${logged ? 'logged' : ''}`}
      style={{ '--card-accent': tracker.color }}
      onClick={() => navigate(`/trackers/${tracker.id}`)}
    >
      <div className="tracker-card-accent" />

      <div className="tracker-card-main">
        <div className="tracker-card-header">
          <span className="tracker-emoji">{tracker.emoji}</span>
          <div className="tracker-meta">
            <span className="tracker-name">{tracker.name}</span>
            <span className="tracker-mode-badge">{MODE_LABELS[tracker.mode]}</span>
          </div>
        </div>
        {tracker.goal_value && (
          <div className="tracker-goal">
            goal: {tracker.goal_value} {tracker.goal_unit || 'per day'}
          </div>
        )}
      </div>

      <div className="tracker-card-right">
        <div className="streak-block">
          <span className="streak-num">{streak}</span>
          <span className="streak-unit">{STREAK_LABELS[tracker.mode]}</span>
        </div>
        <button
          className={`quick-log-btn ${logged ? 'logged' : ''}`}
          onClick={handleLog}
          aria-label={logged ? 'logged today' : 'log now'}
        >
          {logged ? '✓' : '+'}
        </button>
      </div>
    </div>
  );
}
