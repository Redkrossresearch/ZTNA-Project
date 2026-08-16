import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import adminApi from '../../api/adminApi';
import Alert from '../../components/Alert';
import Badge from '../../components/Badge';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { useToast } from '../../components/ToastContext';
import downloadBlob from '../../utils/downloadBlob';
import useDebouncedValue from '../../utils/useDebouncedValue';
import { getErrorMessage } from '../../utils/errorHandling';
import '../../components/layout.css';
import './admin.css';

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyUserId, setBusyUserId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await adminApi.getAllUsers({
          page,
          limit: 20,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
        });
        setUsers(data.data);
        setPagination({ page: data.pagination.page, totalPages: data.pagination.totalPages });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [roleFilter, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter, debouncedSearch]);

  const handleStatusChange = async (userId, status) => {
    setActionError('');
    setBusyUserId(userId);
    try {
      const { data } = await adminApi.changeUserStatus(userId, status);
      setUsers((prev) => prev.map((u) => (u._id === userId ? data.data : u)));
      showToast(`Status updated to "${status}"`);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRoleChange = async (userId, role) => {
    setActionError('');
    setBusyUserId(userId);
    try {
      const { data } = await adminApi.changeUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u._id === userId ? data.data : u)));
      showToast(`Role updated to "${role}"`);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setActionError('');
    try {
      await adminApi.deleteUser(userToDelete._id);
      setUsers((prev) => prev.filter((u) => u._id !== userToDelete._id));
      showToast(`${userToDelete.name} was deleted`);
      setUserToDelete(null);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setActionError('');
    try {
      const response = await adminApi.exportUsersCsv();
      downloadBlob(response.data, `users_report_${Date.now()}.csv`);
      showToast('Users CSV exported');
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage user accounts, roles, and account status across the platform.</p>
      </div>

      <Alert type="error">{error}</Alert>
      <Alert type="error">{actionError}</Alert>

      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Search by name or email..."
          aria-label="Search users by name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <div className="admin-toolbar-spacer" />
        <button type="button" className="btn-secondary" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="panel">
        {isLoading ? (
          <SkeletonTable rows={6} columns={7} />
        ) : users.length === 0 ? (
          <p className="empty-state">No users match these filters.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>MFA</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u._id === currentUser?._id;
                const isBusy = busyUserId === u._id;
                return (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <Badge value={u.role} />
                    </td>
                    <td>
                      <Badge value={u.status} />
                    </td>
                    <td>{u.isMfaEnabled ? u.mfaMethod : 'off'}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      {isSelf ? (
                        <span className="self-row-note">This is you</span>
                      ) : (
                        <div className="row-actions">
                          <select
                            aria-label={`Change role for ${u.name}`}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u._id, e.target.value)}
                            disabled={isBusy}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                          <select
                            aria-label={`Change status for ${u.name}`}
                            value={u.status}
                            onChange={(e) => handleStatusChange(u._id, e.target.value)}
                            disabled={isBusy}
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="suspended">suspended</option>
                          </select>
                          <button
                            type="button"
                            className="danger"
                            aria-label={`Delete ${u.name}`}
                            onClick={() => setUserToDelete(u)}
                            disabled={isBusy}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={loadUsers} />
      </div>

      {userToDelete && (
        <Modal
          title="Delete user"
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteConfirmed}
          confirmLabel="Delete"
          isDangerous
          isSubmitting={isDeleting}
        >
          Are you sure you want to permanently delete <strong>{userToDelete.name}</strong> ({userToDelete.email})?
          This cannot be undone.
        </Modal>
      )}
    </div>
  );
};

export default AdminUsers;
