import axios from 'axios';
import env from '../config/env';
import { getAccessToken, clearTokens } from '../utils/tokenStorage';
import { getDeviceHeaders } from '../utils/deviceHeaders';

/**
 * Single axios instance used by every API service file.
 *
 * withCredentials: true — lets the browser send/receive the backend's
 * httpOnly cookies (accessToken/refreshToken) on same-site requests.
 * We ALSO attach a Bearer header below, since the backend's `protect`
 * middleware accepts either — this keeps auth working even in setups
 * where the cookie doesn't survive (e.g. frontend/backend on different
 * registrable domains).
 */
const axiosClient = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- Request interceptor: attach Bearer token + device signal headers ----
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    Object.assign(config.headers, getDeviceHeaders());

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Registered by AuthContext at app start so this module (which has no
 * knowledge of React state) can still trigger a logout/redirect when the
 * backend reports the session is invalid. Avoids a circular import between
 * axiosClient <-> AuthContext.
 */
let onUnauthorized = null;
const registerUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// ---- Response interceptor: handle expired/invalid/revoked sessions ----
// NOTE: the backend exposes NO refresh-token endpoint (confirmed in Phase 1
// backend analysis) — so a 401 here means the session is truly over and the
// user must log in again. We do not invent a silent-refresh call.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      clearTokens();
      if (typeof onUnauthorized === 'function') {
        onUnauthorized();
      }
    }

    return Promise.reject(error);
  }
);

export { registerUnauthorizedHandler };
export default axiosClient;
