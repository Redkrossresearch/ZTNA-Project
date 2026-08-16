const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Signs a JWT access token. Includes a unique `jti` (JWT ID) so the token
 * can be individually tracked in the Session collection and revoked via
 * the BlacklistedToken collection.
 */
const signAccessToken = (payload) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  return { token, jti };
};

/**
 * Signs a longer-lived refresh token. Also carries its own jti.
 */
const signRefreshToken = (payload) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti }, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  return { token, jti };
};

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if invalid/expired — caller is expected to catch.
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Short-lived token issued after password verification but before MFA
 * is completed. Carries only the userId + purpose, never grants API access
 * (the `protect` middleware never accepts this token type — see authMiddleware).
 */
const signMfaToken = (payload) => {
  return jwt.sign({ ...payload, type: 'mfa_pending' }, env.JWT_SECRET, { expiresIn: '10m' });
};

/**
 * Short-lived token for the forgot-password flow.
 * `verified: false` initially (just requested OTP), then re-issued with
 * `verified: true` once the OTP is confirmed, authorizing the actual
 * password reset step. Never accepted by `protect` as an access token.
 */
const signPasswordResetToken = (payload) => {
  return jwt.sign({ ...payload, type: 'password_reset_pending' }, env.JWT_SECRET, { expiresIn: '10m' });
};

/**
 * Extracts the expiry Date from a signed token's `exp` claim.
 */
const getTokenExpiry = (token) => {
  const decoded = jwt.decode(token);
  return decoded?.exp ? new Date(decoded.exp * 1000) : null;
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  signMfaToken,
  signPasswordResetToken,
  verifyToken,
  getTokenExpiry,
};
