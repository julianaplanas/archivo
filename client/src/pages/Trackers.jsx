import React, { useState, useEffect, useCallback } from 'react';
import TrackerCard from '../components/tracker/TrackerCard';
import CreateTrackerModal from '../components/tracker/CreateTrackerModal';
import LogEntryModal from '../components/tracker/LogEntryModal';
import api from '../lib/api';
import './Trackers.css';

export default function Trackers() {
  const [trackers, setTrackers] = useState([]);
  const [entriesMap, setEntriesMap] = useState({}); // trackerId → entries[]
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [logTarget, setLogTarget] = useState(null); // tracker to log for

  const loadTrackers = useCallback(async () => {
    const { data } = await api.get('/trackers');
    setTrackers(data);
    // Fetch entries for all trackers in parallel (90 days for streak calc)
    const results = await Promise.all(
      data.map(t => api.get(`/trackers/${t.id}/entries?days=90`).then(r => [t.id, r.data]))
    );
    setEntriesMap(Object.fromEntries(results));
    setLoading(false);
  }, []);

  useEffect(() => { loadTrackers(); }, [loadTrackers]);

  async function handleCreate(form) {
    await api.post('/trackers', form);
    await loadTrackers();
  }

  async function handleQuickLog(tracker, mode) {
    if (mode === 'immediate') {
      // boolean immediate log
      await api.post(`/trackers/${tracker.id}/entries`, { value: '1' });
      // refresh just this tracker's entries
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
        <button className="btn btn-ghost" onClick={() => setShowCreate(true)} style={{ fontSize: '13px' }}>
          + new
        </button>
      </div>

      <div className="page-content">
        {trackers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-art">{'[ no trackers yet ]'}</div>
            <div className="empty-sub">tap "+ new" to create your first one</div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              create tracker →
            </button>
          </div>
        ) : (
          <div className="tracker-list">
            {trackers.map((t, i) => (
              <TrackerCard
                key={t.id}
                tracker={t}
                entries={entriesMap[t.id] || []}
                onQuickLog={handleQuickLog}
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTrackerModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
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
