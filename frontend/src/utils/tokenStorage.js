/**
 * Single source of truth for reading/writing auth tokens client-side.
 *
 * The backend ALSO sets httpOnly cookies on login (accessToken/refreshToken),
 * which the browser attaches automatically on same-site requests. Storing
 * the tokens returned in the JSON body here as well lets us:
 *   - send an explicit Authorization: Bearer header (works even if the
 *     cookie is blocked, e.g. cross-domain deployments),
 *   - know synchronously on app load whether a session might exist.
 *
 * No component/service should touch localStorage directly — always go
 * through this module so token handling stays auditable in one place.
 */
const ACCESS_TOKEN_KEY = 'ztna_access_token';
const REFRESH_TOKEN_KEY = 'ztna_refresh_token';

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export { getAccessToken, getRefreshToken, setTokens, clearTokens };
