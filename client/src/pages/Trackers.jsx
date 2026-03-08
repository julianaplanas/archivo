import React, { useState, useEffect, useCallback } from 'react';
import TrackerCard from '../components/tracker/TrackerCard';
import CreateTrackerModal from '../components/tracker/CreateTrackerModal';
import LogEntryModal from '../components/tracker/LogEntryModal';
import api from '../lib/api';
import './Trackers.css';

const ONBOARDING_PRESETS = [
  { name: 'Gym', emoji: '💪', type: 'boolean', mode: 'do_it', color: '#f5c400' },
  { name: 'Sugar', emoji: '🍬', type: 'boolean', mode: 'quit', color: '#d93f2e' },
  { name: 'Daily Meds', emoji: '💊', type: 'boolean', mode: 'do_it', color: '#2563eb' },
  { name: 'Poop', emoji: '💩', type: 'boolean', mode: 'track_only', color: '#a78bfa' },
  { name: 'Menstruation', emoji: '🩸', type: 'boolean', mode: 'track_only', color: '#d93f2e' },
  { name: 'Water', emoji: '💧', type: 'quantity', mode: 'do_it', color: '#2563eb', goal_value: 8, goal_unit: 'glasses' },
  { name: 'Mood', emoji: '🌡', type: 'scale', mode: 'track_only', color: '#f5c400' },
  { name: 'Journal', emoji: '📝', type: 'text', mode: 'do_it', color: '#a78bfa' },
];

function OnboardingPicker({ onCreate, onCustom }) {
  return (
    <div className="onboarding-picker">
      <div className="onboarding-title">what do you want to track?</div>
      <div className="onboarding-sub">pick one or more presets, or start from scratch</div>
      <div className="onboarding-grid">
        {ONBOARDING_PRESETS.map(preset => (
          <button
            key={preset.name}
            className="onboarding-preset-btn"
            style={{ '--preset-color': preset.color }}
            onClick={() => onCreate(preset)}
          >
            <span className="onboarding-preset-emoji">{preset.emoji}</span>
            <span className="onboarding-preset-name">{preset.name}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-ghost onboarding-custom-btn" onClick={onCustom}>
        + custom tracker
      </button>
    </div>
  );
}

export default function Trackers() {
  const [trackers, setTrackers] = useState([]);
  const [entriesMap, setEntriesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [prefilledPreset, setPrefilledPreset] = useState(null);
  const [logTarget, setLogTarget] = useState(null);

  const loadTrackers = useCallback(async () => {
    const { data } = await api.get('/trackers');
    setTrackers(data);
    const results = await Promise.all(
      data.map(t => api.get(`/trackers/${t.id}/entries?days=90`).then(r => [t.id, r.data]))
    );
    setEntriesMap(Object.fromEntries(results));
    setLoading(false);
  }, []);

  useEffect(() => { loadTrackers(); }, [loadTrackers]);

  async function handleCreate(form) {
    await api.post('/trackers', form);
    setPrefilledPreset(null);
    await loadTrackers();
  }

  async function handleQuickLog(tracker, mode) {
    if (mode === 'immediate') {
      await api.post(`/trackers/${tracker.id}/entries`, { value: '1' });
      const { data } = await api.get(`/trackers/${tracker.id}/entries?days=90`);
      setEntriesMap(m => ({ ...m, [tracker.id]: data }));
    } else {
      setLogTarget(tracker);
    }
  }

  async function handleToggleOff(tracker, entry) {
    await api.delete(`/entries/${entry.id}`);
    const { data } = await api.get(`/trackers/${tracker.id}/entries?days=90`);
    setEntriesMap(m => ({ ...m, [tracker.id]: data }));
  }

  async function handleLog(tracker, entryData) {
    await api.post(`/trackers/${tracker.id}/entries`, entryData);
    const { data } = await api.get(`/trackers/${tracker.id}/entries?days=90`);
    setEntriesMap(m => ({ ...m, [tracker.id]: data }));
  }

  function handlePickPreset(preset) {
    setPrefilledPreset(preset);
    setShowCreate(true);
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          loading...
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="trackers-header">
        <h1 className="trackers-title">trackers</h1>
        {trackers.length > 0 && (
          <button className="btn btn-ghost" onClick={() => setShowCreate(true)} style={{ fontSize: '13px' }}>
            + new
          </button>
        )}
      </div>

      <div className="page-content">
        {trackers.length === 0 ? (
          <OnboardingPicker
            onCreate={handlePickPreset}
            onCustom={() => setShowCreate(true)}
          />
        ) : (
          <div className="tracker-list">
            {trackers.map((t, i) => (
              <TrackerCard
                key={t.id}
                tracker={t}
                entries={entriesMap[t.id] || []}
                onQuickLog={handleQuickLog}
                onToggleOff={handleToggleOff}
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTrackerModal
          onSave={handleCreate}
          onClose={() => { setShowCreate(false); setPrefilledPreset(null); }}
          prefilled={prefilledPreset}
        />
      )}

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
