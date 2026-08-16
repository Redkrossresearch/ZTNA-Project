const axios = require('axios');
const env = require('../config/env');
const { isPrivateOrLocalIp } = require('./geoService');

const MALICIOUS_CONFIDENCE_THRESHOLD = 50; // AbuseIPDB confidence score (0-100)

/**
 * Checks an IP's reputation against AbuseIPDB.
 *
 * Requires THREAT_INTEL_API_KEY (AbuseIPDB API key) in .env. Without it,
 * returns a clearly-flagged "unchecked" result rather than silently
 * pretending the IP is clean.
 *
 * `isVpn` is inferred from AbuseIPDB's usageType field (e.g. "Data Center/
 * Web Hosting/Transit") — a reasonable heuristic since AbuseIPDB doesn't
 * provide an explicit VPN boolean on the free tier.
 */
const checkIpReputation = async (ip) => {
  const result = {
    checked: false,
    isMalicious: false,
    isVpn: false,
    abuseScore: 0,
    totalReports: 0,
    usageType: null,
  };

  if (isPrivateOrLocalIp(ip)) {
    return result; // nothing meaningful to check for local/private IPs
  }

  if (!env.THREAT_INTEL_API_KEY) {
    console.warn('[ThreatIntel] THREAT_INTEL_API_KEY not set — skipping IP reputation check.');
    return result;
  }

  try {
    const { data } = await axios.get('https://api.abuseipdb.com/api/v2/check', {
      params: { ipAddress: ip, maxAgeInDays: 90 },
      headers: {
        Key: env.THREAT_INTEL_API_KEY,
        Accept: 'application/json',
      },
      timeout: 5000,
    });

    const d = data.data;
    const usageType = d.usageType || null;
    const isVpn = !!usageType && /hosting|data center|vpn|transit/i.test(usageType);

    return {
      checked: true,
      isMalicious: d.abuseConfidenceScore >= MALICIOUS_CONFIDENCE_THRESHOLD,
      isVpn,
      abuseScore: d.abuseConfidenceScore,
      totalReports: d.totalReports,
      usageType,
    };
  } catch (error) {
    console.error(`[ThreatIntel] Lookup failed for ${ip}: ${error.message}`);
    return result; // fail open on lookup error — never block login due to a flaky third-party API
  }
};

module.exports = { checkIpReputation, MALICIOUS_CONFIDENCE_THRESHOLD };
