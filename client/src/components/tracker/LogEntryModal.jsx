import React, { useState } from 'react';
import Modal from '../ui/Modal';
import './LogEntryModal.css';

const SCALE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function LogEntryModal({ tracker, onLog, onClose, existingEntry = null }) {
  const [value, setValue] = useState(existingEntry?.value ?? (tracker.type === 'boolean' ? '1' : ''));
  const [notes, setNotes] = useState(existingEntry?.notes ?? '');
  const [loggedAt, setLoggedAt] = useState(
    existingEntry?.logged_at
      ? existingEntry.logged_at.slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onLog({ value: String(value), notes: notes || null, logged_at: new Date(loggedAt).toISOString() });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`${tracker.emoji} ${tracker.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="log-form">

        {tracker.type === 'boolean' && (
          <div className="log-boolean-toggle">
            <button
              type="button"
              className={`bool-btn ${value === '1' ? 'active' : ''}`}
              onClick={() => setValue('1')}
            >
              ✓ yes, did it
            </button>
            <button
              type="button"
              className={`bool-btn skip ${value === '0' ? 'active' : ''}`}
              onClick={() => setValue('0')}
            >
              ✗ nope
            </button>
          </div>
        )}

        {tracker.type === 'quantity' && (
          <div className="log-field">
            <label>Amount {tracker.goal_unit ? `(${tracker.goal_unit})` : ''}</label>
            <input
              type="number"
              placeholder="0"
              value={value}
              onChange={e => setValue(e.target.value)}
              min="0"
              step="any"
              autoFocus
            />
          </div>
        )}

        {tracker.type === 'scale' && (
          <div className="log-field">
            <label>How was it? (1–10)</label>
            <div className="scale-grid">
              {SCALE_VALUES.map(n => (
                <button
                  key={n}
                  type="button"
                  className={`scale-btn ${value === String(n) ? 'active' : ''}`}
                  onClick={() => setValue(String(n))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {tracker.type === 'text' && (
          <div className="log-field">
            <label>Note</label>
            <textarea
              placeholder="what happened today..."
              value={value}
              onChange={e => setValue(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>
        )}

        <div className="log-field">
          <label>Notes (optional)</label>
          <input
            type="text"
            placeholder="any context..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="log-field">
          <label>When</label>
          <input
            type="datetime-local"
            value={loggedAt}
            onChange={e => setLoggedAt(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px' }}
          disabled={saving || (tracker.type !== 'boolean' && !value)}
        >
          {saving ? 'saving...' : existingEntry ? 'update entry' : 'log it →'}
        </button>
      </form>
    </Modal>
  );
}
