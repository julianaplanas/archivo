import React, { useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import ConfirmModal from '../ui/ConfirmModal';
import './CraftCard.css';

function daysUntil(dateStr) {
  try { return differenceInCalendarDays(parseISO(dateStr), new Date()); } catch { return null; }
}

export default function CraftCard({ craft, onOpen, onComplete, onUncomplete, onEdit, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const imageUrl = craft.images?.[0]?.filepath
    ? `/uploads/${craft.images[0].filepath}`
    : craft.og_image || null;

  const isCompleted = craft.status === 'completed';
  const deadline = craft.deadline_date ? daysUntil(craft.deadline_date) : null;

  return (
    <div className={`craft-card ${isCompleted ? 'completed' : ''}`} onClick={() => onOpen(craft)}>
      {imageUrl && (
        <div className="craft-card-img">
          <img src={imageUrl} alt={craft.title} loading="lazy" />
        </div>
      )}

      <div className="craft-card-body">
        <div className="craft-card-top">
          <div className="craft-title-row">
            <span className="craft-title">{craft.title}</span>
            <div className="craft-title-meta">
              {isCompleted && <span className="craft-completed-badge">completed ✓</span>}
              {deadline !== null && !isCompleted && (
                <span className={`craft-deadline-badge ${deadline < 0 ? 'overdue' : deadline <= 7 ? 'soon' : ''}`}>
                  {deadline < 0 ? `overdue ${Math.abs(deadline)}d` : deadline === 0 ? '🗓 today!' : `🗓 ${deadline}d`}
                </span>
              )}
            </div>
          </div>
          <div className="craft-card-actions" onClick={e => e.stopPropagation()}>
            <button className="craft-action-btn" onClick={() => onEdit(craft)}>✎</button>
            <button className="craft-action-btn" onClick={() => setShowDeleteConfirm(true)}>🗑</button>
          </div>
        </div>

        {craft.for_person && (
          <div className="craft-for-person">for {craft.for_person}</div>
        )}

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

        <div className="craft-footer" onClick={e => e.stopPropagation()}>
          {isCompleted ? (
            <button className="craft-uncomplete-btn" onClick={() => onUncomplete(craft)}>
              undo ✕
            </button>
          ) : (
            <button className="btn btn-primary craft-complete-btn" onClick={() => onComplete(craft)}>
              mark complete ✓
            </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          message={`delete "${craft.title}"?`}
          onConfirm={() => onDelete(craft.id)}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
