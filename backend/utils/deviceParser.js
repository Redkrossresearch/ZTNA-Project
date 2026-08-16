const { UAParser } = require('ua-parser-js');
const crypto = require('crypto');

/**
 * Parses the request's User-Agent header into structured device info,
 * extracts the real client IP (respecting X-Forwarded-For when behind a
 * proxy/load balancer), and reads optional client-supplied fingerprint
 * signals (screen resolution, timezone) sent as custom headers by the
 * frontend:
 *   X-Screen-Resolution: "1920x1080"
 *   X-Timezone: "Asia/Kolkata"
 */
const getRequestContext = (req) => {
  const uaString = req.headers['user-agent'] || '';
  const parser = new UAParser(uaString);
  const result = parser.getResult();

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    'Unknown';

  const screenResolution = req.headers['x-screen-resolution'] || 'Unknown';
  const timezone = req.headers['x-timezone'] || 'Unknown';

  return {
    ip: ip || 'Unknown',
    browser: result.browser.name ? `${result.browser.name} ${result.browser.version || ''}`.trim() : 'Unknown',
    os: result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'Unknown',
    device: result.device.model || result.device.type || 'Desktop',
    userAgent: uaString,
    screenResolution,
    timezone,
  };
};

/**
 * Generates a stable device fingerprint hash from User-Agent + screen
 * resolution + timezone. Used to detect "is this a known device?" for
 * the user, independent of IP (which changes constantly on mobile/wifi).
 */
const generateDeviceFingerprint = (context) => {
  const raw = `${context.userAgent}|${context.screenResolution}|${context.timezone}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
};

module.exports = { getRequestContext, generateDeviceFingerprint };
