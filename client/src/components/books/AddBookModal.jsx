import React, { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import api from '../../lib/api';
import './AddBookModal.css';

const STATUS_OPTIONS = [
  { value: 'want_to_read', label: '★ want to read' },
  { value: 'reading',      label: '📖 reading' },
  { value: 'read',         label: '✓ read' },
];

function StarRating({ rating, onRate }) {
  return (
    <div className="abm-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`abm-star ${rating >= n ? 'filled' : ''}`}
          onClick={() => onRate(n === rating ? null : n)}
        >
          {rating >= n ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

export default function AddBookModal({ onSave, onClose, existing = null }) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [author, setAuthor] = useState(existing?.author ?? '');
  const [status, setStatus] = useState(existing?.status ?? 'want_to_read');
  const [rating, setRating] = useState(existing?.rating ?? null);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [dateFinished, setDateFinished] = useState(existing?.date_finished ?? '');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (title.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const { data } = await api.post('/ai/book-autocomplete', { query: title });
        setSuggestions(data.suggestions || []);
      } catch { setSuggestions([]); }
      setLoadingSuggestions(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [title]);

  function pickSuggestion(s) {
    setTitle(s.title);
    setAuthor(s.author);
    setSuggestions([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        title: title.trim(),
        author: author.trim() || null,
        status,
        rating: rating ?? null,
        comment: comment.trim() || null,
        date_finished: dateFinished || null,
      };
      if (existing) {
        await api.put(`/books/${existing.id}`, payload);
      } else {
        await api.post('/books', payload);
      }
      onSave();
      onClose();
    } catch { setError('something went wrong'); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={existing ? 'edit book' : 'add book'} onClose={onClose} fullHeight>
      <form onSubmit={handleSubmit} className="abm-form">

        <div className="abm-field">
          <label>title</label>
          <div className="abm-autocomplete-wrap">
            <input
              type="text"
              placeholder="book title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus={!existing}
              autoComplete="off"
            />
            {(loadingSuggestions || suggestions.length > 0) && (
              <div className="abm-suggestions">
                {loadingSuggestions && (
                  <div className="abm-suggestion-loading">searching...</div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="abm-suggestion"
                    onClick={() => pickSuggestion(s)}
                  >
                    <span className="abm-sug-title">{s.title}</span>
                    <span className="abm-sug-meta">{s.author}{s.year ? ` · ${s.year}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="abm-field">
          <label>author</label>
          <input
            type="text"
            placeholder="author name..."
            value={author}
            onChange={e => setAuthor(e.target.value)}
          />
        </div>

        <div className="abm-field">
          <label>status</label>
          <div className="abm-status-grid">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`abm-status-btn ${status === opt.value ? 'active' : ''}`}
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {status === 'read' && (
          <>
            <div className="abm-field">
              <label>rating (optional)</label>
              <StarRating rating={rating} onRate={setRating} />
            </div>

            <div className="abm-field">
              <label>date finished (optional)</label>
              <input
                type="date"
                value={dateFinished}
                onChange={e => setDateFinished(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="abm-field">
          <label>notes (optional)</label>
          <textarea
            placeholder="thoughts, quotes, why you loved it..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />
        </div>

        {error && <div className="abm-error">{error}</div>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }} disabled={saving}>
          {saving ? 'saving...' : existing ? 'save changes' : 'add book →'}
        </button>
      </form>
    </Modal>
  );
}
