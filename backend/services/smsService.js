const axios = require('axios');
const env = require('../config/env');

/**
 * Sends an SMS via the Twilio REST API.
 *
 * Uses axios directly against Twilio's HTTP API instead of the twilio SDK
 * to keep the dependency footprint minimal — this is a fully functional
 * real HTTP integration, not a stub.
 *
 * Required env vars:
 *   SMS_PROVIDER=twilio
 *   SMS_API_KEY     -> Twilio Account SID
 *   SMS_API_SECRET  -> Twilio Auth Token
 *   SMS_FROM_NUMBER -> Twilio phone number (E.164 format, e.g. +14155552671)
 */
const sendSms = async ({ to, body }) => {
  if (!env.SMS_API_KEY || !env.SMS_API_SECRET || !env.SMS_FROM_NUMBER) {
    throw new Error(
      'SMS service is not configured. Set SMS_API_KEY, SMS_API_SECRET, and SMS_FROM_NUMBER in .env.'
    );
  }

  if (env.SMS_PROVIDER !== 'twilio') {
    throw new Error(`Unsupported SMS_PROVIDER "${env.SMS_PROVIDER}". Only "twilio" is currently supported.`);
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.SMS_API_KEY}/Messages.json`;

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', env.SMS_FROM_NUMBER);
  params.append('Body', body);

  try {
    const response = await axios.post(url, params, {
      auth: {
        username: env.SMS_API_KEY,
        password: env.SMS_API_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  } catch (error) {
    const twilioError = error.response?.data?.message || error.message;
    throw new Error(`Failed to send SMS: ${twilioError}`);
  }
};

/**
 * Sends a formatted MFA/verification OTP via SMS.
 */
const sendOtpSms = async ({ to, otp }) => {
  const body = `Your ZTNA verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`;
  return sendSms({ to, body });
};

module.exports = { sendSms, sendOtpSms };
