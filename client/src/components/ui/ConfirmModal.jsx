import React from 'react';
import './ConfirmModal.css';

export default function ConfirmModal({ message = 'are you sure?', onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={onCancel}>cancel</button>
          <button className="confirm-btn confirm-btn-delete" onClick={onConfirm}>delete</button>
        </div>
      </div>
    </div>
  );
}
