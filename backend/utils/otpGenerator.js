const crypto = require('crypto');

/**
 * Generates a cryptographically secure numeric OTP of given length (default 6).
 */
const generateOtp = (length = 6) => {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
};

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

const getOtpExpiry = () => new Date(Date.now() + OTP_EXPIRY_MS);

module.exports = { generateOtp, getOtpExpiry, OTP_EXPIRY_MS, MAX_OTP_ATTEMPTS };
