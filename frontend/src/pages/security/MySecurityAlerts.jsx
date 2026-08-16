import React, { useEffect, useState } from 'react';
import incidentApi from '../../api/incidentApi';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import JsonView from '../../components/JsonView';
import { SkeletonTable } from '../../components/Skeleton';
import { getErrorMessage } from '../../utils/errorHandling';
import '../../components/layout.css';
import '../admin/admin.css';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const formatLocation = (location) => {
  if (!location) return '—';
  const parts = [location.city, location.state, location.country].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

const SOURCE_LABELS = {
  manual: 'Flagged by an administrator',
  system: 'System',
  risk_engine: 'Risk Engine (device/browser/country/time signals)',
  threat_intelligence: 'Threat Intelligence (IP reputation check)',
  device_fingerprint: 'Device Fingerprinting',
  geo_location: 'Geo Location',
  mfa_failure: 'MFA Failure',
};

/**
 * "Security Alerts" for the logged-in user — these are real Incident
 * documents, most of them auto-created by the backend's Risk Engine or
 * Threat Intelligence checks at login time (see authController.js), not
 * just manually-flagged ones.
 */
const MySecurityAlerts = () => {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    incidentApi
      .getMyIncidents()
      .then(({ data }) => {
        if (!cancelled) setIncidents(data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Security Alerts</h1>
        <p>Incidents raised on your account by our automated security systems or an administrator.</p>
      </div>

      <Alert type="error">{error}</Alert>

      <div className="panel">
        {isLoading ? (
          <SkeletonTable rows={4} columns={6} />
        ) : incidents.length === 0 ? (
          <p className="empty-state">No security alerts on your account. All clear.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Reason</th>
                <th>Source</th>
                <th>Status</th>
                <th>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident._id}>
                  <td>
                    <Badge value={incident.severity} />
                  </td>
                  <td>{incident.reason}</td>
                  <td>{incident.source}</td>
                  <td>
                    <Badge value={incident.status} />
                  </td>
                  <td>{formatDate(incident.createdAt)}</td>
                  <td>
                    <button type="button" className="btn-secondary" onClick={() => setSelected(incident)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <Modal title="Alert details" onClose={() => setSelected(null)} onConfirm={() => setSelected(null)} confirmLabel="Close">
          <div className="info-row">
            <span>Severity</span>
            <span>
              <Badge value={selected.severity} />
            </span>
          </div>
          <div className="info-row">
            <span>Status</span>
            <span>
              <Badge value={selected.status} />
            </span>
          </div>
          <div className="info-row">
            <span>Source</span>
            <span>{SOURCE_LABELS[selected.source] || selected.source}</span>
          </div>
          <div className="info-row">
            <span>Device</span>
            <span>
              {selected.device} / {selected.browser} / {selected.os}
            </span>
          </div>
          <div className="info-row">
            <span>IP</span>
            <span>{selected.ip}</span>
          </div>
          <div className="info-row">
            <span>Location</span>
            <span>{formatLocation(selected.location)}</span>
          </div>
          <div className="info-row">
            <span>When</span>
            <span>{formatDate(selected.createdAt)}</span>
          </div>
          {selected.resolutionNotes && (
            <div className="info-row">
              <span>Resolution notes</span>
              <span>{selected.resolutionNotes}</span>
            </div>
          )}
          <h4 style={{ margin: '16px 0 8px', fontSize: 13, color: '#0b1f3a' }}>Details</h4>
          <JsonView data={selected.metadata} />
        </Modal>
      )}
    </div>
  );
};

export default MySecurityAlerts;
