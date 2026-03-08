import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import AddBookModal from '../components/books/AddBookModal';
import './Books.css';

const STATUS_FILTERS = [
  { key: 'all',          label: 'all' },
  { key: 'reading',      label: '📖 reading' },
  { key: 'want_to_read', label: '★ want to read' },
  { key: 'read',         label: '✓ read' },
];

function StarRating({ rating, onRate }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`star ${rating >= n ? 'filled' : ''}`}
          onClick={() => onRate && onRate(n === rating ? null : n)}
        >
          {rating >= n ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

function BookCard({ book, onEdit, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className={`book-card status-${book.status}`}>
      <div className="book-spine" />
      <div className="book-body">
        <div className="book-top">
          <div className="book-title-area">
            <div className="book-title">{book.title}</div>
            {book.author && <div className="book-author">{book.author}</div>}
          </div>
          <div className="book-actions">
            <button className="book-action-btn" onClick={() => onEdit(book)}>✎</button>
            <button className="book-action-btn" onClick={() => setShowDeleteConfirm(true)}>🗑</button>
          </div>
        </div>

        <div className="book-meta">
          <span className={`book-status-badge status-${book.status}`}>
            {book.status === 'read' ? '✓ read' : book.status === 'reading' ? '📖 reading' : '★ want to read'}
          </span>
          {book.status === 'read' && book.rating && (
            <StarRating rating={book.rating} />
          )}
        </div>

        {book.comment && (
          <p className="book-comment">{book.comment}</p>
        )}

        {book.date_finished && (
          <div className="book-date-finished">
            finished {new Date(book.date_finished).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          message={`remove "${book.title}"?`}
          onConfirm={() => onDelete(book.id)}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

export default function Books() {
  const [filter, setFilter] = useState('all');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [searchText, setSearchText] = useState('');

  const loadBooks = useCallback(async () => {
    setLoading(true);
    const q = filter !== 'all' ? `?status=${filter}` : '';
    const { data } = await api.get(`/books${q}`);
    setBooks(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  async function handleDelete(id) {
    await api.delete(`/books/${id}`);
    setBooks(bs => bs.filter(b => b.id !== id));
  }

  const filtered = useMemo(() => {
    if (!searchText.trim()) return books;
    const q = searchText.toLowerCase();
    return books.filter(b => b.title.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q));
  }, [books, searchText]);

  return (
    <div className="page">
      <div className="books-header">
        <h1 className="books-title">books</h1>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowAdd(true)}>
          + add
        </button>
      </div>

      <div className="books-filters">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            className={`book-filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="books-search-bar">
        <input
          type="search"
          placeholder="search books..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>

      <div className="page-content">
        {loading ? (
          <div className="books-loading">loading...</div>
        ) : filtered.length === 0 ? (
          <div className="books-empty">
            <div className="books-empty-art">
              {filter === 'want_to_read'
                ? '[ what\'s next on the pile? → ]'
                : '[ nothing here yet ]'}
            </div>
            <div className="books-empty-sub">
              {searchText ? 'no books match your search' : 'add a book to get started'}
            </div>
            {!searchText && (
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                add book →
              </button>
            )}
          </div>
        ) : (
          <div className="books-list">
            {filtered.map((book, i) => (
              <BookCard
                key={book.id}
                book={book}
                onEdit={b => setEditTarget(b)}
                onDelete={handleDelete}
                style={{ animationDelay: `${i * 0.04}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddBookModal
          onSave={loadBooks}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editTarget && (
        <AddBookModal
          existing={editTarget}
          onSave={() => { loadBooks(); setEditTarget(null); }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
