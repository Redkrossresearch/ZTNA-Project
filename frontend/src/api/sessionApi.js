import axiosClient from './axiosClient';

/** Maps 1:1 to backend routes/sessionRoutes.js */
const sessionApi = {
  getMySessions: ({ all = false } = {}) =>
    axiosClient.get('/sessions', { params: all ? { all: 'true' } : {} }),

  revokeSession: (sessionId) => axiosClient.delete(`/sessions/${sessionId}`),
};

export default sessionApi;
