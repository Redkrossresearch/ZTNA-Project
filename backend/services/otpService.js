const Otp = require('../models/Otp');
const { generateOtp, getOtpExpiry, MAX_OTP_ATTEMPTS } = require('../utils/otpGenerator');
const { sendOtpEmail } = require('./emailService');
const { sendOtpSms } = require('./smsService');

/**
 * Creates a fresh OTP for a user + purpose, invalidating any previous
 * unverified OTPs of the same purpose, then sends it via the requested channel.
 */
const createAndSendOtp = async ({ user, purpose, channel = 'email' }) => {
  // Invalidate previous pending OTPs for this user/purpose so only the latest is valid
  await Otp.deleteMany({ userId: user._id, purpose, verified: false });

  const otp = generateOtp(6);

  const otpDoc = await Otp.create({
    userId: user._id,
    otp,
    purpose,
    channel,
    expiresAt: getOtpExpiry(),
  });

  if (channel === 'email') {
    await sendOtpEmail({ to: user.email, otp, purpose });
  } else if (channel === 'sms') {
    if (!user.phone) {
      throw new Error('No phone number is associated with this account.');
    }
    await sendOtpSms({ to: user.phone, otp });
  }

  return otpDoc;
};

/**
 * Verifies a submitted OTP against the stored record.
 * Returns { success, message, statusCode }.
 * On success, marks the OTP as verified and deletes it (single use).
 */
const verifyOtp = async ({ userId, purpose, submittedOtp }) => {
  const otpDoc = await Otp.findOne({ userId, purpose, verified: false }).sort({ createdAt: -1 });

  if (!otpDoc) {
    return { success: false, statusCode: 400, message: 'No active OTP found. Please request a new one.' };
  }

  if (otpDoc.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: otpDoc._id });
    return { success: false, statusCode: 410, message: 'OTP has expired. Please request a new one.' };
  }

  if (otpDoc.attempts >= MAX_OTP_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpDoc._id });
    return { success: false, statusCode: 429, message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  if (otpDoc.otp !== submittedOtp) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    return {
      success: false,
      statusCode: 401,
      message: 'Incorrect OTP.',
      attemptsRemaining: MAX_OTP_ATTEMPTS - otpDoc.attempts,
    };
  }

  // Correct — clear OTP so it cannot be reused
  await Otp.deleteOne({ _id: otpDoc._id });

  return { success: true, statusCode: 200, message: 'OTP verified successfully' };
};

module.exports = { createAndSendOtp, verifyOtp };
