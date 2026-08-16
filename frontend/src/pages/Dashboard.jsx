import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import sessionApi from '../api/sessionApi';
import accessLogApi from '../api/accessLogApi';
import incidentApi from '../api/incidentApi';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import { SkeletonTable } from '../components/Skeleton';
import { getErrorMessage } from '../utils/errorHandling';
import '../components/layout.css';
import '../pages/auth.css';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const Dashboard = () => {
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [sessionsRes, logsRes, incidentsRes] = await Promise.all([
          sessionApi.getMySessions(),
          accessLogApi.getMyAccessLogs({ page: 1, limit: 5 }),
          incidentApi.getMyIncidents(),
        ]);

        if (cancelled) return;
        setSessions(sessionsRes.data.data);
        setRecentLogs(logsRes.data.data);
        setIncidents(incidentsRes.data.data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSessionsCount = sessions.filter((s) => s.isActive).length;
  const openIncidentsCount = incidents.filter((i) => ['open', 'investigating'].includes(i.status)).length;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p>Here's a summary of your account security status.</p>
      </div>

      <Alert type="error">{error}</Alert>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-label">Account Status</div>
          <div className="stat-card-value" style={{ fontSize: 18 }}>
            <Badge value={user?.status} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">MFA Method</div>
          <div className="stat-card-value" style={{ fontSize: 18 }}>
            {user?.isMfaEnabled ? user?.mfaMethod?.toUpperCase() : 'Disabled'}
          </div>
          <div className="stat-card-sub">
            {user?.mfaMethod === 'sms' && !user?.phoneVerified ? 'Phone not verified yet' : ''}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Active Sessions</div>
          <div className="stat-card-value">{isLoading ? '—' : activeSessionsCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-label">Open Security Incidents</div>
          <div className="stat-card-value">{isLoading ? '—' : openIncidentsCount}</div>
          {openIncidentsCount > 0 && <div className="stat-card-sub">Review flagged activity below</div>}
        </div>
      </div>

      <div className="profile-grid">
        <div className="panel">
          <h3 className="panel-title">Recent Login Activity</h3>
          {isLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : recentLogs.length === 0 ? (
            <p className="empty-state">No access log entries yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Device</th>
                  <th>Location</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <Badge value={log.action === 'login_failed' ? 'high' : 'active'} /> {log.action}
                    </td>
                    <td>
                      {log.browser} / {log.os}
                    </td>
                    <td>{log.location?.country || '—'}</td>
                    <td>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">Recent Security Incidents</h3>
          {isLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : incidents.length === 0 ? (
            <p className="empty-state">No incidents on your account. All clear.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, 5).map((incident) => (
                  <tr key={incident._id}>
                    <td>
                      <Badge value={incident.severity} />
                    </td>
                    <td>{incident.reason}</td>
                    <td>
                      <Badge value={incident.status} />
                    </td>
                    <td>{formatDate(incident.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">Manage Your Security Settings</h3>
        <p style={{ fontSize: 14, color: '#5b6b82', marginBottom: 12 }}>
          Update your MFA method, verify a phone number, or review all active sessions from your profile page.
        </p>
        <Link to="/profile" className="btn-link">
          Go to Profile →
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
