import React from 'react';

const Pagination = ({ page, totalPages, onChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, justifyContent: 'flex-end' }}>
      <button
        type="button"
        className="btn-link"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        style={{ opacity: page <= 1 ? 0.4 : 1 }}
      >
        ← Previous
      </button>
      <span style={{ fontSize: 13, color: '#5b6b82' }}>
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="btn-link"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        style={{ opacity: page >= totalPages ? 0.4 : 1 }}
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;
