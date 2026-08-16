const Incident = require('../models/Incident');

/**
 * Creates a security incident. Designed to be called from:
 * - Admin manual flagging (Phase 8)
 * - Device Fingerprinting / Geo Location (Phase 9)
 * - Risk Engine / Threat Intelligence (Phase 10)
 *
 * `context` is the object returned by utils/deviceParser.getRequestContext.
 */
const raiseIncident = async ({ userId, severity, reason, source = 'manual', context = {}, location = {}, metadata = {} }) => {
  const incident = await Incident.create({
    userId,
    severity,
    reason,
    source,
    device: context.device || 'Unknown',
    browser: context.browser || 'Unknown',
    os: context.os || 'Unknown',
    ip: context.ip || 'Unknown',
    location: {
      country: location.country || null,
      state: location.state || null,
      city: location.city || null,
    },
    metadata,
  });

  return incident;
};

module.exports = { raiseIncident };
