import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import './CraftCard.css';

export default function CraftCard({ craft, onComplete, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const imageUrl = craft.images?.[0]?.filepath
    ? `/uploads/${craft.images[0].filepath}`
    : craft.og_image || null;

  const isCompleted = craft.status === 'completed';

  return (
    <div className={`craft-card ${isCompleted ? 'completed' : ''}`}>
      {imageUrl && (
        <div className="craft-card-img">
          <img src={imageUrl} alt={craft.title} loading="lazy" />
        </div>
      )}

      <div className="craft-card-body">
        <div className="craft-card-top">
          <span className="craft-title">{craft.title}</span>
          <div className="craft-card-actions">
            <button className="craft-action-btn" onClick={() => onEdit(craft)}>✎</button>
            {confirmDelete ? (
              <>
                <button className="craft-action-btn danger" onClick={() => onDelete(craft.id)}>✓</button>
                <button className="craft-action-btn" onClick={() => setConfirmDelete(false)}>✕</button>
              </>
            ) : (
              <button className="craft-action-btn" onClick={() => setConfirmDelete(true)}>🗑</button>
            )}
          </div>
        </div>

        {craft.tags?.length > 0 && (
          <div className="craft-tags">
            {craft.tags.map(tag => (
              <span key={tag} className="craft-tag">{tag}</span>
            ))}
          </div>
        )}

        {craft.description && (
          <p className="craft-description">{craft.description}</p>
        )}

        {craft.source_url && (
          <a
            href={craft.source_url}
            className="craft-source-link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
          >
            {craft.og_title || new URL(craft.source_url).hostname}  ↗
          </a>
        )}

        <div className="craft-footer">
          {isCompleted && craft.completed_at ? (
            <span className="craft-completed-label">
              ✓ completed {format(parseISO(craft.completed_at), 'MMM d, yyyy')}
            </span>
          ) : (
            <button className="btn btn-primary craft-complete-btn" onClick={() => onComplete(craft)}>
              mark complete ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
