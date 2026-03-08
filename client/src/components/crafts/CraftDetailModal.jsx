import React from 'react';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import Modal from '../ui/Modal';
import './CraftDetailModal.css';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return differenceInCalendarDays(parseISO(dateStr), new Date());
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

export default function CraftDetailModal({ craft, onEdit, onClose }) {
  const isCompleted = craft.status === 'completed';
  const deadline = craft.deadline_date ? daysUntil(craft.deadline_date) : null;

  const images = [
    ...(craft.images || []).map(img => `/uploads/${img.filepath}`),
    ...(craft.og_image && !(craft.images?.length) ? [craft.og_image] : []),
  ];

  const urls = craft.source_urls?.length ? craft.source_urls : (craft.source_url ? [craft.source_url] : []);

  return (
    <Modal onClose={onClose} fullHeight>
      <div className="cd-header">
        <div className="cd-badges">
          {isCompleted
            ? <span className="cd-badge completed">completed ✓</span>
            : <span className="cd-badge wishlist">★ wishlist</span>
          }
          {deadline !== null && (
            <span className={`cd-badge deadline ${deadline < 0 ? 'overdue' : deadline <= 7 ? 'soon' : ''}`}>
              {deadline < 0
                ? `overdue by ${Math.abs(deadline)}d`
                : deadline === 0
                ? '🗓 due today!'
                : `🗓 due in ${deadline}d`}
              {craft.deadline_label ? ` · ${craft.deadline_label}` : ''}
            </span>
          )}
        </div>
        <button className="cd-edit-btn" onClick={() => onEdit(craft)}>edit ✎</button>
      </div>

      <h2 className="cd-title">{craft.title}</h2>

      {craft.for_person && (
        <div className="cd-for-person">for {craft.for_person}</div>
      )}

      {images.length > 0 && (
        <div className="cd-images">
          {images.map((src, i) => (
            <img key={i} src={src} alt="" className="cd-img" />
          ))}
        </div>
      )}

      {craft.tags?.length > 0 && (
        <div className="cd-tags">
          {craft.tags.map(tag => (
            <span key={tag} className="craft-tag">{tag}</span>
          ))}
        </div>
      )}

      {craft.description && (
        <p className="cd-description">{craft.description}</p>
      )}

      {craft.materials?.length > 0 && (
        <div className="cd-section">
          <div className="cd-section-label">materials</div>
          <div className="cd-materials">
            {craft.materials.map(m => (
              <div key={m.id} className={`cd-material-item ${m.status}`}>
                <span className="cd-mat-status">{m.status === 'have' ? '✅' : '🛒'}</span>
                <span className="cd-mat-name">{m.name}</span>
                {(m.quantity || m.unit) && (
                  <span className="cd-mat-qty">{m.quantity} {m.unit}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {urls.length > 0 && (
        <div className="cd-section">
          <div className="cd-section-label">links</div>
          <div className="cd-urls">
            {urls.map((url, i) => url && (
              <a key={i} href={url} className="cd-url" target="_blank" rel="noopener noreferrer">
                <span className="cd-url-domain">{getDomain(url)}</span>
                <span className="cd-url-arrow">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {craft.deadline_date && (
        <div className="cd-section">
          <div className="cd-section-label">deadline</div>
          <div className="cd-deadline-info">
            {format(parseISO(craft.deadline_date), 'MMMM d, yyyy')}
            {craft.deadline_label && <span className="cd-deadline-label"> · {craft.deadline_label}</span>}
          </div>
        </div>
      )}
    </Modal>
  );
}
