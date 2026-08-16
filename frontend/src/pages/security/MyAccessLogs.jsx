import React, { useCallback, useEffect, useState } from 'react';
import accessLogApi from '../../api/accessLogApi';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import { SkeletonTable } from '../../components/Skeleton';
import { getErrorMessage } from '../../utils/errorHandling';
import '../../components/layout.css';
import '../admin/admin.css';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const actionBadge = (action) => {
  if (action === 'login_failed') return 'high';
  if (action === 'logout') return 'medium';
  return 'active';
};

const formatLocation = (location) => {
  if (!location) return '—';
  const parts = [location.city, location.state, location.country].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

/** Personal audit log — same shape as the admin-wide view, scoped to /access-logs/me. */
const MyAccessLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await accessLogApi.getMyAccessLogs({ page, limit: 20 });
      setLogs(data.data);
      setPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  return (
    <div>
      <div className="page-header">
        <h1>Access Logs</h1>
        <p>A full audit trail of login activity on your account.</p>
      </div>

      <Alert type="error">{error}</Alert>

      <div className="panel">
        {isLoading ? (
          <SkeletonTable rows={6} columns={5} />
        ) : logs.length === 0 ? (
          <p className="empty-state">No access log entries yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Device</th>
                <th>IP</th>
                <th>Location</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>
                    <Badge value={actionBadge(log.action)} /> {log.action}
                  </td>
                  <td>
                    {log.device} · {log.browser} / {log.os}
                  </td>
                  <td>{log.ip}</td>
                  <td>{formatLocation(log.location)}</td>
                  <td>{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={loadLogs} />
      </div>
    </div>
  );
};

export default MyAccessLogs;
