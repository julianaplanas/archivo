import React, { useState } from 'react';
import Modal from '../ui/Modal';
import './CreateTrackerModal.css';

// Convert HH:MM local time to UTC HH:MM for storage
function localToUTC(hhmm) {
  if (!hhmm) return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const offset = new Date().getTimezoneOffset(); // (UTC - local) in minutes
  let utcMinutes = h * 60 + m + offset;
  utcMinutes = ((utcMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(utcMinutes / 60)).padStart(2, '0')}:${String(utcMinutes % 60).padStart(2, '0')}`;
}

// Convert UTC HH:MM from DB to local HH:MM for display
function utcToLocal(hhmm) {
  if (!hhmm) return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const offset = new Date().getTimezoneOffset();
  let localMinutes = h * 60 + m - offset;
  localMinutes = ((localMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(localMinutes / 60)).padStart(2, '0')}:${String(localMinutes % 60).padStart(2, '0')}`;
}

const PRESETS = [
  { name: 'Gym', emoji: '💪', type: 'boolean', mode: 'do_it', color: '#f5c400', frequency: 'daily_once', tracker_subtype: 'gym' },
  { name: 'Sugar', emoji: '🍬', type: 'boolean', mode: 'quit', color: '#d93f2e', frequency: 'daily_multiple', tracker_subtype: 'sugar' },
  { name: 'Daily Meds', emoji: '💊', type: 'boolean', mode: 'do_it', color: '#2563eb', frequency: 'daily_once', tracker_subtype: 'meds' },
  { name: 'Poop', emoji: '💩', type: 'boolean', mode: 'track_only', color: '#a78bfa', frequency: 'daily_multiple', tracker_subtype: 'poop' },
  { name: 'Period', emoji: '🩸', type: 'scale', mode: 'track_only', color: '#d93f2e', frequency: 'monthly', tracker_subtype: 'menstruation' },
  { name: 'Water', emoji: '💧', type: 'quantity', mode: 'do_it', color: '#2563eb', goal_value: 8, goal_unit: 'glasses', frequency: 'daily_once', tracker_subtype: 'custom' },
  { name: 'Mood', emoji: '🌡', type: 'scale', mode: 'track_only', color: '#f5c400', frequency: 'daily_once', tracker_subtype: 'custom' },
  { name: 'Journal', emoji: '📝', type: 'text', mode: 'do_it', color: '#a78bfa', frequency: 'daily_once', tracker_subtype: 'custom' },
];

const COLORS = ['#f5c400', '#d93f2e', '#2563eb', '#a78bfa', '#fbbf24', '#f472b6', '#34d399', '#60a5fa'];

const FREQUENCY_OPTIONS = [
  { value: 'daily_once',     label: 'once a day' },
  { value: 'daily_multiple', label: 'multiple / day' },
  { value: 'weekly',         label: 'a few / week' },
  { value: 'monthly',        label: 'a few / month' },
];

const BLANK = {
  name: '',
  emoji: '📌',
  type: 'boolean',
  mode: 'do_it',
  goal_value: '',
  goal_unit: '',
  notifications_enabled: false,
  notification_time: '09:00',
  color: '#f5c400',
  frequency: 'daily_once',
  tracker_subtype: 'custom',
};

export default function CreateTrackerModal({ onSave, onClose, existing = null, prefilled = null }) {
  const [form, setForm] = useState(existing ? {
    ...existing,
    goal_value: existing.goal_value ?? '',
    goal_unit: existing.goal_unit ?? '',
    // Display notification_time in local time
    notification_time: existing.notification_time ? utcToLocal(existing.notification_time) : '09:00',
    notifications_enabled: !!existing.notifications_enabled,
    frequency: existing.frequency ?? 'daily_once',
    tracker_subtype: existing.tracker_subtype ?? 'custom',
  } : prefilled ? { ...BLANK, ...prefilled } : BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function applyPreset(preset) {
    setForm(f => ({ ...BLANK, ...preset }));
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        goal_value: form.goal_value !== '' ? Number(form.goal_value) : null,
        goal_unit: form.goal_unit || null,
        // Convert notification_time from local to UTC before saving
        notification_time: form.notifications_enabled ? localToUTC(form.notification_time) : null,
      });
      onClose();
    } catch {
      setError('something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={existing ? 'edit tracker' : 'new tracker'} onClose={onClose} fullHeight>
      {!existing && (
        <div className="presets-section">
          <div className="presets-label">quick presets</div>
          <div className="presets-scroll">
            {PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                className={`preset-chip ${form.name === p.name ? 'active' : ''}`}
                onClick={() => applyPreset(p)}
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-row">
          <div className="form-field emoji-field">
            <label>emoji</label>
            <input
              type="text"
              value={form.emoji}
              onChange={e => set('emoji', e.target.value.trim().slice(-2) || '📌')}
              maxLength={2}
              style={{ textAlign: 'center', fontSize: '22px' }}
            />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>name</label>
            <input
              type="text"
              placeholder="e.g. Morning Run"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              autoFocus={!existing && !prefilled}
            />
          </div>
        </div>

        <div className="form-field">
          <label>entry type</label>
          <div className="option-grid">
            {[
              { value: 'boolean', label: '✓ did / didn\'t' },
              { value: 'quantity', label: '# how much' },
              { value: 'scale', label: '★ 1–10 scale' },
              { value: 'text', label: '✎ free note' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`option-btn ${form.type === opt.value ? 'active' : ''}`}
                onClick={() => set('type', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>mode</label>
          <div className="option-grid cols-3">
            {[
              { value: 'do_it', label: '✅ do it' },
              { value: 'quit', label: '🚫 quit' },
              { value: 'track_only', label: '👁 just track' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`option-btn ${form.mode === opt.value ? 'active' : ''}`}
                onClick={() => set('mode', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>how often?</label>
          <div className="option-grid cols-2">
            {FREQUENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`option-btn ${form.frequency === opt.value ? 'active' : ''}`}
                onClick={() => set('frequency', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {(form.type === 'quantity' || form.type === 'boolean') && (
          <div className="form-row">
            <div className="form-field">
              <label>goal (optional)</label>
              <input
                type="number"
                placeholder="e.g. 3"
                value={form.goal_value}
                onChange={e => set('goal_value', e.target.value)}
                min="0"
                step="any"
              />
            </div>
            <div className="form-field">
              <label>unit</label>
              <input
                type="text"
                placeholder="e.g. times/week"
                value={form.goal_unit}
                onChange={e => set('goal_unit', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="form-field">
          <label>color</label>
          <div className="color-row">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-dot ${form.color === c ? 'active' : ''}`}
                style={{ '--dot': c }}
                onClick={() => set('color', c)}
              />
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="toggle-label">
            <span>daily reminder</span>
            <button
              type="button"
              className={`toggle ${form.notifications_enabled ? 'on' : ''}`}
              onClick={() => set('notifications_enabled', !form.notifications_enabled)}
            />
          </label>
          {form.notifications_enabled && (
            <input
              type="time"
              value={form.notification_time}
              onChange={e => set('notification_time', e.target.value)}
              style={{ marginTop: '8px' }}
            />
          )}
        </div>

        {error && <div className="form-error">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '14px' }}
          disabled={saving}
        >
          {saving ? 'saving...' : existing ? 'save changes' : 'create tracker →'}
        </button>
      </form>
    </Modal>
  );
}
