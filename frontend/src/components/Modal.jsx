import React, { useEffect, useRef } from 'react';

const Modal = ({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  isDangerous = false,
  isSubmitting,
}) => {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    dialogRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Return focus to whatever triggered the modal, for keyboard users
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11,31,58,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        style={{ background: '#fff', borderRadius: 12, padding: 24, width: 380, maxWidth: '90vw', outline: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="modal-title" style={{ margin: '0 0 12px', color: '#0b1f3a' }}>
          {title}
        </h3>
        <div style={{ fontSize: 14, color: '#5b6b82', marginBottom: 20 }}>{children}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-link" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={isDangerous ? { background: '#d64545' } : undefined}
            onClick={onConfirm}
            disabled={isSubmitting}
            autoFocus
          >
            {isSubmitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
