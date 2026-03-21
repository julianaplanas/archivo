import React, { useState } from 'react';
import Modal from '../ui/Modal';
import './LogEntryModal.css';

function toLocalInputValue(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SCALE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const BRISTOL = [
  { n: 1, desc: 'hard lumps' },
  { n: 2, desc: 'lumpy' },
  { n: 3, desc: 'cracked' },
  { n: 4, desc: 'smooth 👌' },
  { n: 5, desc: 'soft blobs' },
  { n: 6, desc: 'mushy' },
  { n: 7, desc: 'liquid' },
];

const FLOW_LEVELS = [
  { value: '1', label: 'spotting', dot: '·' },
  { value: '2', label: 'light', dot: '◉' },
  { value: '3', label: 'medium', dot: '◉◉' },
  { value: '4', label: 'heavy', dot: '◉◉◉' },
];

const TRAINING_TYPES = ['strength', 'cardio', 'yoga', 'climbing', 'other'];

// ─── Subtype forms ────────────────────────────────────────────────────────────

function PoopForm({ metadata, setMetadata }) {
  return (
    <div className="log-field">
      <label>bristol scale (optional)</label>
      <div className="bristol-grid">
        {BRISTOL.map(b => (
          <button
            key={b.n}
            type="button"
            className={`bristol-btn ${metadata.bristol_scale === b.n ? 'active' : ''}`}
            onClick={() => setMetadata(m => ({ ...m, bristol_scale: m.bristol_scale === b.n ? null : b.n }))}
          >
            <span className="bristol-num">{b.n}</span>
            <span className="bristol-desc">{b.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MenstruationForm({ value, setValue }) {
  return (
    <div className="log-field">
      <label>flow</label>
      <div className="flow-grid">
        {FLOW_LEVELS.map(f => (
          <button
            key={f.value}
            type="button"
            className={`flow-btn ${value === f.value ? 'active' : ''}`}
            onClick={() => setValue(f.value)}
          >
            <span className="flow-dot">{f.dot}</span>
            <span className="flow-label">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GymForm({ value, setValue, metadata, setMetadata }) {
  function toggleTraining(t) {
    const current = metadata.training_types || [];
    const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
    setMetadata(m => ({ ...m, training_types: next }));
  }
  return (
    <>
      <div className="log-boolean-toggle">
        <button type="button" className={`bool-btn ${value === '1' ? 'active' : ''}`} onClick={() => setValue('1')}>
          💪 went
        </button>
        <button type="button" className={`bool-btn skip ${value === '0' ? 'active' : ''}`} onClick={() => setValue('0')}>
          ✗ skipped
        </button>
      </div>
      {value === '1' && (
        <div className="log-field">
          <label>type of training</label>
          <div className="training-chips">
            {TRAINING_TYPES.map(t => (
              <button
                key={t}
                type="button"
                className={`training-chip ${(metadata.training_types || []).includes(t) ? 'active' : ''}`}
                onClick={() => toggleTraining(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function MedsForm({ value, setValue }) {
  return (
    <div className="log-boolean-toggle">
      <button type="button" className={`bool-btn ${value === '1' ? 'active' : ''}`} onClick={() => setValue('1')}>
        💊 took it
      </button>
      <button type="button" className={`bool-btn skip ${value === '0' ? 'active' : ''}`} onClick={() => setValue('0')}>
        ✗ missed
      </button>
    </div>
  );
}

function SugarForm({ notes, setNotes }) {
  return (
    <div className="log-field">
      <label>what was it? (optional)</label>
      <input
        type="text"
        placeholder='e.g. "birthday cake", "coffee with sugar"'
        value={notes}
        onChange={e => setNotes(e.target.value)}
        autoFocus
      />
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function LogEntryModal({ tracker, onLog, onClose, existingEntry = null }) {
  const subtype = tracker.tracker_subtype || 'custom';

  function defaultValue() {
    if (existingEntry) return existingEntry.value ?? '';
    if (subtype === 'poop' || subtype === 'sugar') return '1';
    if (subtype === 'menstruation') return '2';
    if (tracker.type === 'boolean') return '1';
    return '';
  }

  function defaultMetadata() {
    if (existingEntry?.entry_metadata) {
      try { return JSON.parse(existingEntry.entry_metadata); } catch {}
    }
    return {};
  }

  const [value, setValue] = useState(defaultValue);
  const [notes, setNotes] = useState(existingEntry?.notes ?? '');
  const [metadata, setMetadata] = useState(defaultMetadata);
  const [loggedAt, setLoggedAt] = useState(
    existingEntry?.logged_at
      ? toLocalInputValue(new Date(existingEntry.logged_at))
      : toLocalInputValue(new Date())
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        value: String(value),
        notes: notes || null,
        logged_at: new Date(loggedAt).toISOString(),
      };
      const metaKeys = Object.keys(metadata).filter(k => metadata[k] !== null && metadata[k] !== undefined);
      if (metaKeys.length > 0) payload.entry_metadata = metadata;
      await onLog(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const isValid = value !== '' && value !== null;

  return (
    <Modal title={`${tracker.emoji} ${tracker.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="log-form">

        {subtype === 'poop' && <PoopForm metadata={metadata} setMetadata={setMetadata} />}
        {subtype === 'menstruation' && <MenstruationForm value={value} setValue={setValue} />}
        {subtype === 'gym' && <GymForm value={value} setValue={setValue} metadata={metadata} setMetadata={setMetadata} />}
        {subtype === 'meds' && <MedsForm value={value} setValue={setValue} />}
        {subtype === 'sugar' && <SugarForm notes={notes} setNotes={setNotes} />}

        {subtype === 'custom' && tracker.type === 'boolean' && (
          <div className="log-boolean-toggle">
            <button type="button" className={`bool-btn ${value === '1' ? 'active' : ''}`} onClick={() => setValue('1')}>✓ yes, did it</button>
            <button type="button" className={`bool-btn skip ${value === '0' ? 'active' : ''}`} onClick={() => setValue('0')}>✗ nope</button>
          </div>
        )}

        {subtype === 'custom' && tracker.type === 'quantity' && (
          <div className="log-field">
            <label>amount {tracker.goal_unit ? `(${tracker.goal_unit})` : ''}</label>
            <input type="number" placeholder="0" value={value} onChange={e => setValue(e.target.value)} min="0" step="any" autoFocus />
          </div>
        )}

        {subtype === 'custom' && tracker.type === 'scale' && (
          <div className="log-field">
            <label>how was it? (1–10)</label>
            <div className="scale-grid">
              {SCALE_VALUES.map(n => (
                <button key={n} type="button" className={`scale-btn ${value === String(n) ? 'active' : ''}`} onClick={() => setValue(String(n))}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {subtype === 'custom' && tracker.type === 'text' && (
          <div className="log-field">
            <label>note</label>
            <textarea placeholder="what happened today..." value={value} onChange={e => setValue(e.target.value)} rows={3} autoFocus />
          </div>
        )}

        {subtype !== 'sugar' && (
          <div className="log-field">
            <label>notes (optional)</label>
            <input type="text" placeholder="any context..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        )}

        <div className="log-field">
          <label>when</label>
          <input type="datetime-local" value={loggedAt} onChange={e => setLoggedAt(e.target.value)} />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px' }}
          disabled={saving || !isValid}
        >
          {saving ? 'saving...' : existingEntry ? 'update entry' : 'log it →'}
        </button>
      </form>
    </Modal>
  );
}
