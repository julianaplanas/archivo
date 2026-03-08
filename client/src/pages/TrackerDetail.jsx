import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import confetti from 'canvas-confetti';
import { computeStreak, isLoggedToday, getMilestone } from '../lib/streak';
import LogEntryModal from '../components/tracker/LogEntryModal';
import CreateTrackerModal from '../components/tracker/CreateTrackerModal';
import HeatmapCalendar from '../components/tracker/HeatmapCalendar';
import ConfirmModal from '../components/ui/ConfirmModal';
import api from '../lib/api';
import './TrackerDetail.css';

function monthlyStats(entries) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysSoFar = now.getDate();

  const thisMonth = entries.filter(e => {
    const d = parseISO(e.logged_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const lastMonth = entries.filter(e => {
    const d = parseISO(e.logged_at);
    const lm = month === 0 ? 11 : month - 1;
    const ly = month === 0 ? year - 1 : year;
    return d.getFullYear() === ly && d.getMonth() === lm;
  });

  const uniqueDays = new Set(thisMonth.map(e => parseISO(e.logged_at).getDate())).size;
  const pct = Math.round((uniqueDays / daysSoFar) * 100);

  const lmDays = new Set(lastMonth.map(e => parseISO(e.logged_at).getDate())).size;
  const lmPct = Math.round((lmDays / daysInMonth) * 100);

  return { uniqueDays, daysSoFar, pct, lmPct, trend: pct - lmPct };
}

const MODE_LABELS = { quit: '🚫 quit', do_it: '✅ do it', track_only: '👁 tracking' };

export default function TrackerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tracker, setTracker] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState(null);

  const load = useCallback(async () => {
    const [t, e] = await Promise.all([
      api.get(`/trackers/${id}`),
      api.get(`/trackers/${id}/entries?days=90`),
    ]);
    setTracker(t.data);
    setEntries(e.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Fire confetti once when a milestone is reached
  const [confettiFired, setConfettiFired] = useState(false);
  useEffect(() => {
    if (!loading && !confettiFired) {
      const streak = tracker ? computeStreak(entries, tracker) : 0;
      if (getMilestone(streak)) {
        setConfettiFired(true);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#f5c400', '#d93f2e', '#2563eb', '#f0ece0'],
        });
      }
    }
  }, [loading, tracker, entries, confettiFired]);

  async function handleLog(data) {
    await api.post(`/trackers/${id}/entries`, data);
    const { data: e } = await api.get(`/trackers/${id}/entries?days=90`);
    setEntries(e);
  }

  async function handleEditLog(data) {
    await api.put(`/entries/${editEntry.id}`, data);
    const { data: e } = await api.get(`/trackers/${id}/entries?days=90`);
    setEntries(e);
    setEditEntry(null);
  }

  async function handleDeleteEntry(entryId) {
    await api.delete(`/entries/${entryId}`);
    setEntries(e => e.filter(x => x.id !== entryId));
    setDeleteEntryId(null);
  }

  async function handleSaveTracker(form) {
    await api.put(`/trackers/${id}`, form);
    const { data: t } = await api.get(`/trackers/${id}`);
    setTracker(t);
  }

  async function handleDeleteTracker() {
    await api.delete(`/trackers/${id}`);
    navigate('/trackers');
  }

  if (loading) return (
    <div className="page">
      <div className="page-content" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        loading...
      </div>
    </div>
  );

  if (!tracker) return null;

  const streak = computeStreak(entries, tracker);
  const loggedToday = isLoggedToday(entries);
  const milestone = getMilestone(streak);
  const stats = monthlyStats(entries);
  const recentEntries = [...entries].slice(0, 30);

  function formatValue(entry) {
    if (tracker.type === 'boolean') return entry.value === '1' ? 'yes ✓' : 'no ✗';
    if (tracker.type === 'scale') {
      const max = tracker.tracker_subtype === 'poop' ? 7 : 10;
      return `${entry.value}/${max}`;
    }
    return entry.value || '—';
  }

  return (
    <div className="page">
      <div className="detail-header" style={{ '--accent': tracker.color }}>
        <button className="back-btn" onClick={() => navigate('/trackers')}>← back</button>
        <button className="edit-btn" onClick={() => setShowEdit(true)}>edit</button>
      </div>

      <div className="page-content">
        {/* Hero */}
        <div className="detail-hero">
          <div className="detail-emoji">{tracker.emoji}</div>
          <div className="detail-name">{tracker.name}</div>
          <div className="detail-mode">{MODE_LABELS[tracker.mode]}</div>
        </div>

        {/* Streak */}
        <div className="streak-card" style={{ '--accent': tracker.color }}>
          <div className="streak-big">{streak}</div>
          <div className="streak-desc">
            {tracker.mode === 'quit' ? 'days clean' : 'day streak'}
          </div>
          {milestone && (
            <div className="milestone-badge">🎉 {milestone}-day milestone!</div>
          )}
          <div className={`today-status ${loggedToday ? 'logged' : ''}`}>
            {loggedToday ? '✓ logged today' : '○ not logged today'}
          </div>
        </div>

        {/* Heatmap */}
        <div style={{ marginBottom: '12px' }}>
          <div className="section-label" style={{ marginBottom: '10px' }}>last 3 months</div>
          <HeatmapCalendar entries={entries} tracker={tracker} />
        </div>

        {/* Monthly summary */}
        <div className="stats-card">
          <div className="section-label">this month</div>
          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-num">{stats.uniqueDays}</div>
              <div className="stat-label">days logged</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">{stats.pct}%</div>
              <div className="stat-label">of days so far</div>
            </div>
            <div className="stat-item">
              <div className={`stat-num ${stats.trend >= 0 ? 'up' : 'down'}`}>
                {stats.trend > 0 ? '+' : ''}{stats.trend}%
              </div>
              <div className="stat-label">vs last month</div>
            </div>
          </div>
        </div>

        {/* Log button */}
        <button
          className="btn btn-primary log-cta"
          style={{ width: '100%' }}
          onClick={() => setShowLog(true)}
        >
          + log entry
        </button>

        {/* Entry history */}
        <div>
          <div className="section-label" style={{ marginBottom: '10px' }}>history</div>
          {recentEntries.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
              no entries yet — start logging!
            </div>
          ) : (
            <div className="entry-list">
              {recentEntries.map(entry => (
                <div key={entry.id} className="entry-row">
                  <div className="entry-main">
                    <span className="entry-value">{formatValue(entry)}</span>
                    {entry.notes && <span className="entry-notes">{entry.notes}</span>}
                  </div>
                  <div className="entry-meta">
                    <span className="entry-date">
                      {format(parseISO(entry.logged_at), 'MMM d, HH:mm')}
                    </span>
                    <div className="entry-actions">
                      <button className="entry-action-btn" onClick={() => setEditEntry(entry)}>✎</button>
                      <button className="entry-action-btn danger" onClick={() => setDeleteEntryId(entry.id)}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="danger-zone">
          <button className="btn btn-ghost danger" onClick={() => setShowDeleteConfirm(true)}>
            delete tracker
          </button>
        </div>
      </div>

      {showLog && (
        <LogEntryModal
          tracker={tracker}
          onLog={handleLog}
          onClose={() => setShowLog(false)}
        />
      )}

      {editEntry && (
        <LogEntryModal
          tracker={tracker}
          onLog={handleEditLog}
          onClose={() => setEditEntry(null)}
          existingEntry={editEntry}
        />
      )}

      {showEdit && (
        <CreateTrackerModal
          existing={tracker}
          onSave={handleSaveTracker}
          onClose={() => setShowEdit(false)}
        />
      )}

      {deleteEntryId && (
        <ConfirmModal
          message="delete this entry? this can't be undone."
          onConfirm={() => handleDeleteEntry(deleteEntryId)}
          onCancel={() => setDeleteEntryId(null)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          message={`delete "${tracker.name}"? this removes all entries too.`}
          onConfirm={handleDeleteTracker}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
