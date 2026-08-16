import axiosClient from './axiosClient';

/** Maps 1:1 to backend routes/adminRoutes.js (all admin-only) */
const adminApi = {
  // ---- Dashboard analytics ----
  getDashboardStats: () => axiosClient.get('/admin/dashboard'),
  getDashboardSummary: () => axiosClient.get('/admin/dashboard/summary'),
  getDashboardTrends: ({ days = 30 } = {}) =>
    axiosClient.get('/admin/dashboard/trends', { params: { days } }),
  getRiskDistribution: () => axiosClient.get('/admin/dashboard/risk-distribution'),
  getIncidentsBySeverity: ({ openOnly = false } = {}) =>
    axiosClient.get('/admin/dashboard/incidents-by-severity', {
      params: openOnly ? { openOnly: 'true' } : {},
    }),
  getTopLocations: ({ limit = 10 } = {}) =>
    axiosClient.get('/admin/dashboard/top-locations', { params: { limit } }),

  // ---- CSV exports — raw file responses, not JSON ----
  exportUsersCsv: () => axiosClient.get('/admin/dashboard/export/users', { responseType: 'blob' }),
  exportIncidentsCsv: () =>
    axiosClient.get('/admin/dashboard/export/incidents', { responseType: 'blob' }),

  // ---- User management ----
  getAllUsers: ({ page = 1, limit = 20, role, status, search } = {}) =>
    axiosClient.get('/admin/users', { params: { page, limit, role, status, search } }),
  getUserById: (userId) => axiosClient.get(`/admin/users/${userId}`),
  deleteUser: (userId) => axiosClient.delete(`/admin/users/${userId}`),
  changeUserStatus: (userId, status) =>
    axiosClient.patch(`/admin/users/${userId}/status`, { status }),
  changeUserRole: (userId, role) => axiosClient.patch(`/admin/users/${userId}/role`, { role }),
};

export default adminApi;
