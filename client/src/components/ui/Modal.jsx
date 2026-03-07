import React, { useEffect } from 'react';
import './Modal.css';

export default function Modal({ title, onClose, children, fullHeight = false }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-sheet ${fullHeight ? 'full-height' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-handle" />
        {title && <div className="modal-title">{title}</div>}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
