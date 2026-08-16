import React, { useCallback, useEffect, useState } from 'react';
import accessLogApi from '../../api/accessLogApi';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import { SkeletonTable } from '../../components/Skeleton';
import { getErrorMessage } from '../../utils/errorHandling';
import '../../components/layout.css';
import './admin.css';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const actionBadge = (action) => {
  if (action === 'login_failed') return 'high';
  if (action === 'logout') return 'medium';
  return 'active';
};

const AdminAccessLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ userId: '', action: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await accessLogApi.getAllAccessLogs({
          page,
          limit: 20,
          userId: filters.userId || undefined,
          action: filters.action || undefined,
        });
        setLogs(data.data);
        setPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    loadLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div>
      <div className="page-header">
        <h1>Access Logs</h1>
        <p>Platform-wide login, logout, and failed-login activity.</p>
      </div>

      <Alert type="error">{error}</Alert>

      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Filter by user ID..."
          value={filters.userId}
          onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
        />
        <select value={filters.action} onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}>
          <option value="">All actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="login_failed">Login failed</option>
        </select>
      </div>

      <div className="panel">
        {isLoading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : logs.length === 0 ? (
          <p className="empty-state">No access log entries match these filters.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
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
                  <td>{log.userId?.name || log.userId?.email || log.userId || 'Unknown'}</td>
                  <td>
                    <Badge value={actionBadge(log.action)} /> {log.action}
                  </td>
                  <td>
                    {log.browser} / {log.os}
                  </td>
                  <td>{log.ip}</td>
                  <td>{log.location?.country || '—'}</td>
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

export default AdminAccessLogs;
