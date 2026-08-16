const RISK_WEIGHTS = {
  NEW_DEVICE: 20,
  NEW_BROWSER: 15,
  NEW_COUNTRY: 25,
  VPN_OR_PROXY: 20,
  FAILED_LOGINS: 15,
  UNUSUAL_LOGIN_TIME: 10,
};

const HIGH_RISK_THRESHOLD = 50;
const MEDIUM_RISK_THRESHOLD = 25;

const FAILED_LOGIN_THRESHOLD = 3; // 3+ recent failed attempts contributes to risk

// Treat midnight–5am (server local time) as an unusual login window.
// This is a simple heuristic; could be personalized per-user in the future.
const UNUSUAL_HOUR_START = 0;
const UNUSUAL_HOUR_END = 5;

/**
 * Calculates a login risk score (0-100+) from a set of signals and maps
 * it to a LOW / MEDIUM / HIGH risk level.
 *
 * Inputs:
 *   isNewDevice    - device fingerprint not seen before
 *   isNewBrowser   - browser not seen before for this user
 *   isNewCountry   - geo country differs from user's last known country
 *   isVpnOrProxy   - threat intel flagged the IP as hosting/VPN/proxy
 *   recentFailedLogins - count of failed logins in the last hour
 */
const calculateRisk = ({
  isNewDevice = false,
  isNewBrowser = false,
  isNewCountry = false,
  isVpnOrProxy = false,
  recentFailedLogins = 0,
  loginTime = new Date(),
}) => {
  const factors = [];
  let score = 0;

  if (isNewDevice) {
    score += RISK_WEIGHTS.NEW_DEVICE;
    factors.push('New/unrecognized device');
  }
  if (isNewBrowser) {
    score += RISK_WEIGHTS.NEW_BROWSER;
    factors.push('New/unrecognized browser');
  }
  if (isNewCountry) {
    score += RISK_WEIGHTS.NEW_COUNTRY;
    factors.push('Login from a new country');
  }
  if (isVpnOrProxy) {
    score += RISK_WEIGHTS.VPN_OR_PROXY;
    factors.push('IP associated with VPN/proxy/hosting provider');
  }
  if (recentFailedLogins >= FAILED_LOGIN_THRESHOLD) {
    score += RISK_WEIGHTS.FAILED_LOGINS;
    factors.push(`${recentFailedLogins} failed login attempts in the last hour`);
  }

  const hour = loginTime.getHours();
  if (hour >= UNUSUAL_HOUR_START && hour < UNUSUAL_HOUR_END) {
    score += RISK_WEIGHTS.UNUSUAL_LOGIN_TIME;
    factors.push('Login during an unusual time window (12am–5am)');
  }

  let level = 'low';
  if (score >= HIGH_RISK_THRESHOLD) level = 'high';
  else if (score >= MEDIUM_RISK_THRESHOLD) level = 'medium';

  return { score, level, factors };
};

module.exports = { calculateRisk, RISK_WEIGHTS, HIGH_RISK_THRESHOLD, MEDIUM_RISK_THRESHOLD };
