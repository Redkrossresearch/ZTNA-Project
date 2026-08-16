import axiosClient from './axiosClient';

/** Maps 1:1 to backend routes/incidentRoutes.js */
const incidentApi = {
  getMyIncidents: () => axiosClient.get('/incidents/me'),

  // Admin-only
  createIncident: ({ userId, severity, reason, metadata }) =>
    axiosClient.post('/incidents', { userId, severity, reason, metadata }),

  getAllIncidents: ({ page = 1, limit = 20, severity, status, source, userId } = {}) =>
    axiosClient.get('/incidents', { params: { page, limit, severity, status, source, userId } }),

  getIncidentById: (incidentId) => axiosClient.get(`/incidents/${incidentId}`),

  updateIncidentStatus: (incidentId, { status, resolutionNotes }) =>
    axiosClient.patch(`/incidents/${incidentId}/status`, { status, resolutionNotes }),
};

export default incidentApi;
