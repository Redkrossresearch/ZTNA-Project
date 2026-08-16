const Session = require('../models/Session');
const AccessLog = require('../models/AccessLog');
const BlacklistedToken = require('../models/BlacklistedToken');
const { getTokenExpiry } = require('../utils/jwt');

/**
 * Creates a Session record for a newly issued access token and writes
 * a corresponding "login" entry to the access log.
 */
const createSessionAndLog = async ({ user, accessToken, jti, context, location = {}, riskLevel = 'low' }) => {
  const expiresAt = getTokenExpiry(accessToken) || new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = await Session.create({
    userId: user._id,
    jti,
    device: context.device,
    browser: context.browser,
    os: context.os,
    ip: context.ip,
    location: {
      country: location.country || null,
      state: location.state || null,
      city: location.city || null,
    },
    riskLevel,
    expiresAt,
  });

  await AccessLog.create({
    userId: user._id,
    action: 'login',
    device: context.device,
    browser: context.browser,
    os: context.os,
    ip: context.ip,
    location: {
      country: location.country || null,
      state: location.state || null,
      city: location.city || null,
    },
  });

  return session;
};

/**
 * Logs a failed login attempt (no session, since auth never succeeded).
 */
const logFailedLogin = async ({ userId, context }) => {
  await AccessLog.create({
    userId,
    action: 'login_failed',
    device: context.device,
    browser: context.browser,
    os: context.os,
    ip: context.ip,
  });
};

/**
 * Revokes a session: blacklists its jti and marks it inactive, then
 * writes a "logout" access log entry.
 */
const revokeSessionByJti = async ({ jti, userId, reason = 'logout', context = null }) => {
  const session = await Session.findOne({ jti });

  if (session && session.isActive) {
    session.isActive = false;
    session.revokedAt = new Date();
    await session.save();
  }

  // Blacklist regardless of whether a Session doc was found, so the raw
  // token itself can never be reused even if session bookkeeping is missing.
  const expiresAt = session?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  await BlacklistedToken.updateOne(
    { jti },
    { $setOnInsert: { jti, userId, reason, expiresAt } },
    { upsert: true }
  );

  if (context) {
    await AccessLog.create({
      userId,
      action: 'logout',
      device: context.device,
      browser: context.browser,
      os: context.os,
      ip: context.ip,
    });
  }

  return session;
};

/**
 * Revokes ALL active sessions for a user (e.g. on password change,
 * or an admin-initiated "log out everywhere").
 */
const revokeAllSessions = async ({ userId, reason = 'security' }) => {
  const sessions = await Session.find({ userId, isActive: true });

  await Promise.all(
    sessions.map((session) =>
      BlacklistedToken.updateOne(
        { jti: session.jti },
        { $setOnInsert: { jti: session.jti, userId, reason, expiresAt: session.expiresAt } },
        { upsert: true }
      )
    )
  );

  await Session.updateMany({ userId, isActive: true }, { isActive: false, revokedAt: new Date() });

  return sessions.length;
};

const isTokenBlacklisted = async (jti) => {
  if (!jti) return false;
  const found = await BlacklistedToken.findOne({ jti });
  return !!found;
};

/**
 * Counts how many failed login AccessLog entries exist for a user within
 * the given time window — used by the Risk Engine as a signal.
 */
const countRecentFailedLogins = async ({ userId, windowMs = 60 * 60 * 1000 }) => {
  return AccessLog.countDocuments({
    userId,
    action: 'login_failed',
    createdAt: { $gte: new Date(Date.now() - windowMs) },
  });
};

module.exports = {
  createSessionAndLog,
  logFailedLogin,
  revokeSessionByJti,
  revokeAllSessions,
  isTokenBlacklisted,
  countRecentFailedLogins,
};
