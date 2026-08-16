import React, { useCallback, useEffect, useState } from 'react';
import incidentApi from '../../api/incidentApi';
import adminApi from '../../api/adminApi';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import JsonView from '../../components/JsonView';
import { SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../components/ToastContext';
import downloadBlob from '../../utils/downloadBlob';
import { getErrorMessage } from '../../utils/errorHandling';
import '../../components/layout.css';
import './admin.css';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'investigating', 'resolved', 'closed'];

const AdminIncidents = () => {
  const { showToast } = useToast();
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ severity: '', status: '', source: '', userId: '' });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // ---- Users list (for the "create incident" userId picker only) ----
  const [users, setUsers] = useState([]);

  // ---- Status update modal ----
  const [editingIncident, setEditingIncident] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'open', resolutionNotes: '' });
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // ---- Create incident form ----
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ userId: '', severity: 'medium', reason: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadIncidents = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await incidentApi.getAllIncidents({
          page,
          limit: 20,
          severity: filters.severity || undefined,
          status: filters.status || undefined,
          source: filters.source || undefined,
          userId: filters.userId || undefined,
        });
        setIncidents(data.data);
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
    loadIncidents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Lightweight one-time fetch to populate the userId picker for manual incident creation
  useEffect(() => {
    adminApi
      .getAllUsers({ page: 1, limit: 100 })
      .then(({ data }) => setUsers(data.data))
      .catch(() => setUsers([]));
  }, []);

  const openStatusModal = (incident) => {
    setEditingIncident(incident);
    setStatusForm({ status: incident.status, resolutionNotes: incident.resolutionNotes || '' });
    setStatusError('');
  };

  const handleSaveStatus = async () => {
    if (!editingIncident) return;
    setIsSavingStatus(true);
    setStatusError('');
    try {
      const { data } = await incidentApi.updateIncidentStatus(editingIncident._id, statusForm);
      setIncidents((prev) => prev.map((i) => (i._id === editingIncident._id ? data.data : i)));
      setEditingIncident(null);
      showToast(`Incident status updated to "${statusForm.status}"`);
    } catch (err) {
      setStatusError(getErrorMessage(err));
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleCreateIncident = async () => {
    setCreateError('');

    if (!createForm.userId || !createForm.reason.trim()) {
      setCreateError('User and reason are required.');
      return;
    }

    setIsCreating(true);
    try {
      await incidentApi.createIncident({
        userId: createForm.userId,
        severity: createForm.severity,
        reason: createForm.reason.trim(),
      });
      setShowCreateForm(false);
      setCreateForm({ userId: '', severity: 'medium', reason: '' });
      showToast('Incident created');
      loadIncidents(1);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await adminApi.exportIncidentsCsv();
      downloadBlob(response.data, `incidents_report_${Date.now()}.csv`);
      showToast('Incidents CSV exported');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Incident Management</h1>
        <p>Review and resolve security incidents raised automatically or manually.</p>
      </div>

      <Alert type="error">{error}</Alert>

      <div className="admin-toolbar">
        <select value={filters.severity} onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={filters.source} onChange={(e) => setFilters((p) => ({ ...p, source: e.target.value }))}>
          <option value="">All sources</option>
          <option value="manual">Manual</option>
          <option value="system">System</option>
          <option value="risk_engine">Risk Engine</option>
          <option value="threat_intelligence">Threat Intelligence</option>
          <option value="device_fingerprint">Device Fingerprint</option>
          <option value="geo_location">Geo Location</option>
          <option value="mfa_failure">MFA Failure</option>
        </select>
        <div className="admin-toolbar-spacer" />
        <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(true)}>
          + New Incident
        </button>
        <button type="button" className="btn-secondary" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="panel">
        {isLoading ? (
          <SkeletonTable rows={6} columns={7} />
        ) : incidents.length === 0 ? (
          <p className="empty-state">No incidents match these filters.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Severity</th>
                <th>Reason</th>
                <th>Source</th>
                <th>Status</th>
                <th>When</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident._id}>
                  <td>{incident.userId?.name || incident.userId?.email || 'Unknown'}</td>
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
                    <button type="button" className="btn-secondary" onClick={() => openStatusModal(incident)}>
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={loadIncidents} />
      </div>

      {editingIncident && (
        <Modal
          title="Update incident status"
          onClose={() => setEditingIncident(null)}
          onConfirm={handleSaveStatus}
          confirmLabel="Save"
          isSubmitting={isSavingStatus}
        >
          <Alert type="error">{statusError}</Alert>

          <div className="info-row">
            <span>Device</span>
            <span>
              {editingIncident.device} / {editingIncident.browser} / {editingIncident.os}
            </span>
          </div>
          <div className="info-row">
            <span>IP</span>
            <span>{editingIncident.ip}</span>
          </div>
          <div className="info-row">
            <span>Location</span>
            <span>
              {[editingIncident.location?.city, editingIncident.location?.state, editingIncident.location?.country]
                .filter(Boolean)
                .join(', ') || '—'}
            </span>
          </div>
          <h4 style={{ margin: '14px 0 6px', fontSize: 13, color: '#0b1f3a' }}>Detection details</h4>
          <JsonView data={editingIncident.metadata} />

          <div className="form-group" style={{ marginTop: 16 }}>
            <label htmlFor="incidentStatus">Status</label>
            <select
              id="incidentStatus"
              value={statusForm.status}
              onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value }))}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="resolutionNotes">Resolution notes (optional)</label>
            <input
              id="resolutionNotes"
              type="text"
              value={statusForm.resolutionNotes}
              onChange={(e) => setStatusForm((p) => ({ ...p, resolutionNotes: e.target.value }))}
            />
          </div>
        </Modal>
      )}

      {showCreateForm && (
        <Modal
          title="Create manual incident"
          onClose={() => setShowCreateForm(false)}
          onConfirm={handleCreateIncident}
          confirmLabel={isCreating ? 'Creating...' : 'Create'}
          isSubmitting={isCreating}
        >
          <Alert type="error">{createError}</Alert>
          <div className="form-group">
            <label htmlFor="incidentUser">User</label>
            <select
              id="incidentUser"
              value={createForm.userId}
              onChange={(e) => setCreateForm((p) => ({ ...p, userId: e.target.value }))}
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="incidentSeverity">Severity</label>
            <select
              id="incidentSeverity"
              value={createForm.severity}
              onChange={(e) => setCreateForm((p) => ({ ...p, severity: e.target.value }))}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="incidentReason">Reason</label>
            <input
              id="incidentReason"
              type="text"
              value={createForm.reason}
              onChange={(e) => setCreateForm((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminIncidents;
