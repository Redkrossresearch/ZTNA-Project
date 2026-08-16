/**
 * Builds the two custom headers the backend's utils/deviceParser.js reads
 * for device fingerprinting and risk scoring:
 *   X-Screen-Resolution
 *   X-Timezone
 *
 * Without these, the backend still works (falls back to "Unknown"), but
 * device-fingerprint-based "known device" detection is far less accurate,
 * meaning MFA may be triggered more often than necessary.
 */
const getDeviceHeaders = () => {
  const headers = {};

  if (typeof window !== 'undefined' && window.screen) {
    headers['X-Screen-Resolution'] = `${window.screen.width}x${window.screen.height}`;
  }

  try {
    headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
  } catch (err) {
    headers['X-Timezone'] = 'Unknown';
  }

  return headers;
};

export { getDeviceHeaders };
