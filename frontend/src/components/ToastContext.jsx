import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(undefined);

let idCounter = 0;

/**
 * Global toast system for transient, non-blocking feedback (e.g. "User
 * updated", "Session revoked", "CSV exported"). Inline <Alert> stays in
 * charge of form validation errors — toasts are for one-off confirmations
 * of an action that already succeeded/failed, not for guiding form input.
 */
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const showToast = useCallback(
    (message, { type = 'success', duration = 4000 } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => removeToast(id), duration);
      return id;
    },
    [removeToast]
  );

  const value = { showToast, removeToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const useToast = () => {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

export { ToastProvider, useToast };
