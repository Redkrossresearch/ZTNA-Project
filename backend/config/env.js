require('dotenv').config();

/**
 * Centralized, validated access to environment variables.
 * Throws early on boot if a required variable is missing, instead of
 * failing later with a confusing runtime error.
 */
const required = ['MONGO_URI', 'JWT_SECRET'];

required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  MONGO_URI: process.env.MONGO_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,

  SMS_PROVIDER: process.env.SMS_PROVIDER,
  SMS_API_KEY: process.env.SMS_API_KEY,
  SMS_API_SECRET: process.env.SMS_API_SECRET,
  SMS_FROM_NUMBER: process.env.SMS_FROM_NUMBER,

  THREAT_INTEL_API_KEY: process.env.THREAT_INTEL_API_KEY,
  THREAT_INTEL_PROVIDER: process.env.THREAT_INTEL_PROVIDER,

  GEO_API_KEY: process.env.GEO_API_KEY,

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
};
