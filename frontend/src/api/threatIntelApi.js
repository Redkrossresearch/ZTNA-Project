import axiosClient from './axiosClient';

/** Maps 1:1 to backend routes/threatIntelRoutes.js (admin-only) */
const threatIntelApi = {
  checkIp: (ip) => axiosClient.get(`/threat-intel/check/${encodeURIComponent(ip)}`),
};

export default threatIntelApi;
