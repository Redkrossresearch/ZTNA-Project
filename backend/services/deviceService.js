const MAX_KNOWN_DEVICES = 10;
const MAX_KNOWN_BROWSERS = 10;

/**
 * Checks whether the given fingerprint matches one of the user's
 * previously seen devices.
 */
const isKnownDevice = (user, fingerprint) => {
  return user.knownDevices.includes(fingerprint);
};

/**
 * Registers a new device fingerprint for the user, capping the list at
 * MAX_KNOWN_DEVICES (oldest dropped first) to keep the document bounded.
 * Does not save — caller is expected to call user.save() afterward.
 */
const registerDevice = (user, fingerprint) => {
  if (user.knownDevices.includes(fingerprint)) return;

  user.knownDevices.push(fingerprint);
  if (user.knownDevices.length > MAX_KNOWN_DEVICES) {
    user.knownDevices = user.knownDevices.slice(-MAX_KNOWN_DEVICES);
  }
};

/**
 * Checks whether the given browser string has been seen before for this
 * user — used by the Risk Engine as a distinct signal from full device
 * fingerprint (e.g. same laptop, but logging in from a different browser).
 */
const isKnownBrowser = (user, browser) => {
  return user.knownBrowsers.includes(browser);
};

const registerBrowser = (user, browser) => {
  if (!browser || browser === 'Unknown' || user.knownBrowsers.includes(browser)) return;

  user.knownBrowsers.push(browser);
  if (user.knownBrowsers.length > MAX_KNOWN_BROWSERS) {
    user.knownBrowsers = user.knownBrowsers.slice(-MAX_KNOWN_BROWSERS);
  }
};

module.exports = {
  isKnownDevice,
  registerDevice,
  isKnownBrowser,
  registerBrowser,
  MAX_KNOWN_DEVICES,
  MAX_KNOWN_BROWSERS,
};
