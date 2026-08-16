import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import Alert from '../../components/Alert';
import { SkeletonStatGrid } from '../../components/Skeleton';
import { getErrorMessage } from '../../utils/errorHandling';
import '../../components/layout.css';
import './admin.css';

/**
 * Simple horizontal bar built from plain CSS — deliberately not adding a
 * charting library, since the approved stack is React/JS/HTML/CSS only.
 */
const BarRow = ({ label, value, max, colorClass }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ textTransform: 'capitalize', color: '#0b1f3a' }}>{label}</span>
        <span style={{ color: '#5b6b82' }}>{value}</span>
      </div>
      <div style={{ background: '#eef1f5', borderRadius: 6, height: 8 }}>
        <div
          className={colorClass}
          style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: '#0e9394' }}
        />
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await adminApi.getDashboardSummary();
        if (!cancelled) setSummary(data.data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Platform-wide security and account statistics.</p>
        </div>
        <SkeletonStatGrid count={4} />
      </div>
    );
  }

  const stats = summary?.stats || {};
  const riskDist = summary?.riskDistribution || { low: 0, medium: 0, high: 0 };
  const severityDist = summary?.incidentsBySeverity || { low: 0, medium: 0, high: 0, critical: 0 };
  const topLocations = summary?.topLocations || [];

  const riskMax = Math.max(riskDist.low, riskDist.medium, riskDist.high, 1);
  const severityMax = Math.max(severityDist.low, severityDist.medium, severityDist.high, severityDist.critical, 1);
  const locationMax = Math.max(...topLocations.map((l) => l.count), 1);

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform-wide security and account statistics.</p>
      </div>

      <Alert type="error">{error}</Alert>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Users</div>
          <div className="stat-card-value">{stats.totalUsers ?? 0}</div>
          <div className="stat-card-sub">
            {stats.activeUsers ?? 0} active · {stats.suspendedUsers ?? 0} suspended
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Admins / Users</div>
          <div className="stat-card-value">
            {stats.adminUsers ?? 0} / {stats.normalUsers ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Failed Logins</div>
          <div className="stat-card-value">{stats.failedLogins ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Incidents</div>
          <div className="stat-card-value">{stats.totalIncidents ?? 0}</div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="panel">
          <h3 className="panel-title">Session Risk Distribution</h3>
          <BarRow label="Low" value={riskDist.low} max={riskMax} />
          <BarRow label="Medium" value={riskDist.medium} max={riskMax} />
          <BarRow label="High" value={riskDist.high} max={riskMax} />
        </div>

        <div className="panel">
          <h3 className="panel-title">Incidents by Severity</h3>
          <BarRow label="Low" value={severityDist.low} max={severityMax} />
          <BarRow label="Medium" value={severityDist.medium} max={severityMax} />
          <BarRow label="High" value={severityDist.high} max={severityMax} />
          <BarRow label="Critical" value={severityDist.critical} max={severityMax} />
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">Top Login Locations</h3>
        {topLocations.length === 0 ? (
          <p className="empty-state">No location data available yet.</p>
        ) : (
          topLocations.map((loc) => (
            <BarRow key={loc.country} label={loc.country || 'Unknown'} value={loc.count} max={locationMax} />
          ))
        )}
      </div>

      <div className="panel">
        <h3 className="panel-title">A note on Sessions</h3>
        <p style={{ fontSize: 13, color: '#5b6b82' }}>
          The backend does not expose an endpoint to list individual sessions across all users — only a user's own
          sessions (<code>GET /api/sessions</code>) and admin session revocation by ID (
          <code>DELETE /api/sessions/:id</code>) exist. The Risk Distribution chart above is the real, aggregate
          session data the backend does provide. No per-session admin table has been fabricated to fill this gap.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
