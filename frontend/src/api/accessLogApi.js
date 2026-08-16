import axiosClient from './axiosClient';

/** Maps 1:1 to backend routes/accessLogRoutes.js */
const accessLogApi = {
  getMyAccessLogs: ({ page = 1, limit = 20 } = {}) =>
    axiosClient.get('/access-logs/me', { params: { page, limit } }),

  // Admin-only
  getAllAccessLogs: ({ page = 1, limit = 20, userId, action } = {}) =>
    axiosClient.get('/access-logs', { params: { page, limit, userId, action } }),
};

export default accessLogApi;
