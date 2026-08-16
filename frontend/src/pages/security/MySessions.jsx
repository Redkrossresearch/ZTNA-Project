import React, { useCallback, useEffect, useState } from 'react';
import sessionApi from '../../api/sessionApi';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../components/ToastContext';
import { getErrorMessage } from '../../utils/errorHandling';
import '../../components/layout.css';
import '../admin/admin.css';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const formatLocation = (location) => {
  if (!location) return '—';
  const parts = [location.city, location.state, location.country].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

/**
 * Every field rendered here (device, browser, os, riskLevel, location) is a
 * real Session document field — nothing computed or invented client-side.
 * riskLevel is set by the backend's Risk Engine at login time; the device
 * fingerprint itself is a SHA-256 hash the backend never exposes over the
 * API, so we show the human-readable device/browser/os signals instead.
 */
const MySessions = () => {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [sessionToRevoke, setSessionToRevoke] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await sessionApi.getMySessions({ all: showAll });
      setSessions(data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [showAll]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevoke = async () => {
    if (!sessionToRevoke) return;
    setIsRevoking(true);
    setRevokeError('');
    try {
      const wasCurrent = sessionToRevoke.isCurrent;
      await sessionApi.revokeSession(sessionToRevoke._id);
      setSessionToRevoke(null);
      showToast(wasCurrent ? 'Logged out successfully' : 'Session revoked successfully');
      loadSessions();
    } catch (err) {
      setRevokeError(getErrorMessage(err));
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>My Sessions</h1>
        <p>Devices and locations currently (or previously) signed in to your account.</p>
      </div>

      <Alert type="error">{error}</Alert>

      <div className="admin-toolbar">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5b6b82' }}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show revoked/expired sessions too
        </label>
      </div>

      <div className="panel">
        {isLoading ? (
          <SkeletonTable rows={4} columns={6} />
        ) : sessions.length === 0 ? (
          <p className="empty-state">No sessions found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Location</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Last active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id}>
                  <td>
                    {s.device} · {s.browser} on {s.os}
                    {s.isCurrent && (
                      <>
                        {' '}
                        <span className="badge badge-active">this device</span>
                      </>
                    )}
                    <div className="field-hint">{s.ip}</div>
                  </td>
                  <td>{formatLocation(s.location)}</td>
                  <td>
                    <Badge value={s.riskLevel} />
                  </td>
                  <td>
                    <Badge value={s.isActive ? 'active' : 'inactive'} />
                  </td>
                  <td>{formatDate(s.lastActivityAt)}</td>
                  <td>
                    {s.isActive && (
                      <div className="row-actions">
                        <button type="button" className="danger" onClick={() => setSessionToRevoke(s)}>
                          {s.isCurrent ? 'Log out' : 'Revoke'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sessionToRevoke && (
        <Modal
          title={sessionToRevoke.isCurrent ? 'Log out this device' : 'Revoke session'}
          onClose={() => setSessionToRevoke(null)}
          onConfirm={handleRevoke}
          confirmLabel={sessionToRevoke.isCurrent ? 'Log out' : 'Revoke'}
          isDangerous
          isSubmitting={isRevoking}
        >
          <Alert type="error">{revokeError}</Alert>
          {sessionToRevoke.isCurrent
            ? "This will end your current session and you'll need to sign in again."
            : `This will immediately sign out ${sessionToRevoke.device} · ${sessionToRevoke.browser}.`}
        </Modal>
      )}
    </div>
  );
};

export default MySessions;
