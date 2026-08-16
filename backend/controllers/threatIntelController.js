const { checkIpReputation } = require('../services/threatIntelService');

/**
 * GET /api/threat-intel/check/:ip
 * Admin-only. Manually checks an IP's reputation via AbuseIPDB —
 * useful for investigating an incident or vetting an IP before
 * whitelisting/blocking it elsewhere in the stack.
 */
const checkIp = async (req, res) => {
  try {
    const { ip } = req.params;

    if (!ip) {
      return res.status(422).json({ success: false, message: 'IP address is required' });
    }

    const reputation = await checkIpReputation(ip);

    return res.status(200).json({
      success: true,
      data: { ip, ...reputation },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to check IP reputation', error: error.message });
  }
};

module.exports = { checkIp };
