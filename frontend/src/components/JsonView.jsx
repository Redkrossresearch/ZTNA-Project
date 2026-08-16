import React from 'react';

/**
 * Renders a metadata object (e.g. an Incident's `metadata` field, which
 * carries real risk-engine factors or threat-intel scores set by the
 * backend) as a simple, readable key/value list — no raw JSON dump.
 */
const JsonView = ({ data }) => {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return <span className="field-hint">No additional metadata.</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="info-row">
          <span>{key}</span>
          <span>{Array.isArray(value) ? value.join('; ') : String(value)}</span>
        </div>
      ))}
    </div>
  );
};

export default JsonView;
