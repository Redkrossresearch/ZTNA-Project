const axios = require('axios');
const env = require('../config/env');

/**
 * Private/loopback IP ranges — geolocation lookups are meaningless for these
 * (common in local development), so we short-circuit instead of wasting an
 * API call or returning misleading data.
 */
const isPrivateOrLocalIp = (ip) => {
  if (!ip || ip === 'Unknown') return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    /^::ffff:127\./.test(ip)
  );
};

/**
 * Resolves an IP address to { country, state, city }.
 *
 * Uses ipinfo.io (token-authenticated, higher rate limits) if GEO_API_KEY
 * is set; otherwise falls back to the free, keyless ipapi.co endpoint.
 * Never throws — geo lookups are best-effort and must not block login.
 */
const getGeoLocation = async (ip) => {
  const unknown = { country: null, state: null, city: null };

  if (isPrivateOrLocalIp(ip)) {
    return unknown;
  }

  try {
    if (env.GEO_API_KEY) {
      const { data } = await axios.get(`https://ipinfo.io/${ip}/json`, {
        params: { token: env.GEO_API_KEY },
        timeout: 5000,
      });
      return {
        country: data.country || null,
        state: data.region || null,
        city: data.city || null,
      };
    }

    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 5000 });
    if (data.error) return unknown;

    return {
      country: data.country_name || null,
      state: data.region || null,
      city: data.city || null,
    };
  } catch (error) {
    // Best-effort only — a failed geo lookup should never break login
    console.error(`[GeoService] Lookup failed for ${ip}: ${error.message}`);
    return unknown;
  }
};

module.exports = { getGeoLocation, isPrivateOrLocalIp };
