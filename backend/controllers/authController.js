const User = require('../models/User');
const axios = require("axios");
const { signAccessToken, signRefreshToken, signMfaToken, signPasswordResetToken, verifyToken } = require('../utils/jwt');
const { validatePasswordPolicy } = require('../utils/passwordPolicy');
const { createAndSendOtp, verifyOtp } = require('../services/otpService');
const { getRequestContext, generateDeviceFingerprint } = require('../utils/deviceParser');
const { isKnownDevice, registerDevice, isKnownBrowser, registerBrowser } = require('../services/deviceService');
const { getGeoLocation } = require('../services/geoService');
const { checkIpReputation } = require('../services/threatIntelService');
const { calculateRisk } = require('../services/riskEngineService');
const { createSessionAndLog, logFailedLogin, revokeSessionByJti, revokeAllSessions, countRecentFailedLogins } = require('../services/sessionService');
const { raiseIncident } = require('../services/incidentService');
const env = require('../config/env');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
};

/**
 * Shared final step of any successful login (MFA-completed or MFA-skipped):
 * - Resolves geo location from IP, flags + raises an incident if the
 *   country differs from the user's last known login country.
 * - Registers the device fingerprint as known going forward.
 * - Issues access/refresh tokens, creates the Session + AccessLog entry.
 * - Sets auth cookies.
 *
 * Returns { accessToken, refreshToken } — the caller builds its own
 * response shape (messages differ slightly between flows).
 */
const finalizeLogin = async ({ user, req, res, context, location, riskLevel = 'low' }) => {
  const fingerprint = generateDeviceFingerprint(context);
  console.log("========== FINALIZE LOGIN ==========");
console.log("Location received:", location);

  if (user.lastLoginCountry && location.country && location.country !== user.lastLoginCountry) {
    await raiseIncident({
      userId: user._id,
      severity: 'high',
      reason: `Login from a new country: ${location.country} (previous: ${user.lastLoginCountry})`,
      source: 'geo_location',
      context,
      location,
    });
  }

  if (location.country) {
    user.lastLoginCountry = location.country;
  }

  registerDevice(user, fingerprint);
  registerBrowser(user, context.browser);
  user.lastLoginAt = new Date();
  await user.save();

  const tokenPayload = { id: user._id.toString(), role: user.role };
  const { token: accessToken, jti } = signAccessToken(tokenPayload);
  const { token: refreshToken } = signRefreshToken(tokenPayload);

  await createSessionAndLog({ user, accessToken, jti, context, location, riskLevel });

  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/register
 * Creates a new user account with hashed password.
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.valid) {
      return res.status(422).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordCheck.errors,
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user with email + password and issues JWTs.
 *
 * NOTE: MFA (Email/SMS OTP) is layered on top of this in Phase 4 & 6.
 * For now this issues the JWT directly upon valid credentials, per the
 * phase plan ("Phase 2: Login + JWT", MFA added in later phases).
 */

const login = async (req, res) => {

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`,
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact an administrator.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;

      const context = getRequestContext(req);
      await logFailedLogin({ userId: user._id, context });

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
        await user.save();

        await raiseIncident({
          userId: user._id,
          severity: 'high',
          reason: `Account locked after ${MAX_FAILED_ATTEMPTS} consecutive failed login attempts`,
          source: 'system',
          context,
        });

        return res.status(423).json({
          success: false,
          message: 'Account locked due to too many failed login attempts. Try again in 15 minutes.',
        });
      }

      await user.save();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        attemptsRemaining: MAX_FAILED_ATTEMPTS - user.failedLoginAttempts,
      });
    }

    // Successful password authentication — reset failed attempt counters
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

   // ---- Device & Context Gathering ----
const context = getRequestContext(req);

// Development-only enhancement
if (
  process.env.NODE_ENV === "development" &&
  (
    context.ip === "127.0.0.1" ||
    context.ip === "::1" ||
    context.ip.startsWith("::ffff:127.")
  )
) {
  try {
    const { data } = await axios.get("https://api.ipify.org?format=json", {
      timeout: 5000,
    });

    context.ip = data.ip;

    console.log("[DEV] Using public IP:", context.ip);
  } catch (err) {
    console.log("[DEV] Unable to fetch public IP:", err.message);
  }
}

const fingerprint = generateDeviceFingerprint(context);
const knownDevice = isKnownDevice(user, fingerprint);
const knownBrowser = isKnownBrowser(user, context.browser);
const location = await getGeoLocation(context.ip);
console.log("Public IP:", context.ip);
console.log("Geo Location:", location);

const isNewCountry = !!(
  user.lastLoginCountry &&
  location.country &&
  location.country !== user.lastLoginCountry
);

    // ---- Threat Intelligence: IP Reputation ----
    const reputation = await checkIpReputation(context.ip);

    if (reputation.checked && reputation.isMalicious) {
      await raiseIncident({
        userId: user._id,
        severity: 'critical',
        reason: `Login blocked: IP flagged by threat intelligence (AbuseIPDB confidence score ${reputation.abuseScore}/100, ${reputation.totalReports} reports)`,
        source: 'threat_intelligence',
        context,
        location,
        metadata: { abuseScore: reputation.abuseScore, totalReports: reputation.totalReports },
      });

      return res.status(403).json({
        success: false,
        message: 'Login blocked: this IP address has been flagged as malicious by threat intelligence services.',
      });
    }

    // ---- Risk Engine ----
    const recentFailedLogins = await countRecentFailedLogins({ userId: user._id });
    const risk = calculateRisk({
      isNewDevice: !knownDevice,
      isNewBrowser: !knownBrowser,
      isNewCountry,
      isVpnOrProxy: reputation.isVpn,
      recentFailedLogins,
      loginTime: new Date(),
    });

    if (risk.level === 'high') {
      await raiseIncident({
        userId: user._id,
        severity: 'high',
        reason: `High-risk login detected (score ${risk.score}): ${risk.factors.join('; ')}`,
        source: 'risk_engine',
        context,
        location,
        metadata: { riskScore: risk.score, factors: risk.factors },
      });
    }

    // ---- MFA step (Email or SMS, per user preference) ----
    // MFA is required if: the user has it enabled by default, OR this is an
    // unrecognized device, OR the Risk Engine scored this login as HIGH risk.
    // Even MFA-disabled accounts must verify identity under these conditions.
    const mfaForced = !knownDevice || risk.level === 'high';
    if (user.isMfaEnabled || mfaForced) {
      const channel = user.mfaMethod === 'sms' ? 'sms' : 'email';
      const purpose = channel === 'sms' ? 'login_mfa_sms' : 'login_mfa_email';

      if (channel === 'sms' && !user.phoneVerified) {
        return res.status(409).json({
          success: false,
          message: 'SMS MFA is selected but no verified phone number is on file. Please verify a phone number first.',
        });
      }

      try {
        await createAndSendOtp({ user, purpose, channel });
      } catch (otpError) {
        return res.status(502).json({
          success: false,
          message: `Failed to send verification code via ${channel}. Please try again shortly.`,
          error: otpError.message,
        });
      }

      const mfaToken = signMfaToken({ id: user._id.toString() });

      return res.status(200).json({
        success: true,
        mfaRequired: true,
        mfaChannel: channel,
        newDevice: !knownDevice,
        riskLevel: risk.level,
        message: !knownDevice
          ? `New device detected. A verification code has been sent via ${channel} to confirm it's you.`
          : risk.level === 'high'
            ? `This login was flagged as high risk. A verification code has been sent via ${channel} to confirm it's you.`
            : `Password verified. A verification code has been sent via ${channel}.`,
        data: { mfaToken },
      });
    }

    // MFA disabled, device already known, and risk is not high — finalize login directly
    const { accessToken, refreshToken } = await finalizeLogin({
      user,
      req,
      res,
      context,
      location,
      riskLevel: risk.level,
    });

    return res.status(200).json({
      success: true,
      mfaRequired: false,
      riskLevel: risk.level,
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Body: { mfaToken, otp }
 * Completes the login flow after a valid OTP is submitted.
 */
const verifyLoginOtp = async (req, res) => {
  try {
    const { mfaToken, otp } = req.body;

    if (!mfaToken || !otp) {
      return res.status(422).json({
        success: false,
        message: 'mfaToken and otp are required',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(mfaToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired MFA session. Please log in again.',
      });
    }

    if (decoded.type !== 'mfa_pending') {
      return res.status(400).json({ success: false, message: 'Invalid token type for this operation' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const purpose = user.mfaMethod === 'sms' ? 'login_mfa_sms' : 'login_mfa_email';

    const result = await verifyOtp({
      userId: decoded.id,
      purpose,
      submittedOtp: otp,
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
        ...(result.attemptsRemaining !== undefined && { attemptsRemaining: result.attemptsRemaining }),
      });
    }

    const context = getRequestContext(req);

// Development-only enhancement
if (
  process.env.NODE_ENV === "development" &&
  (
    context.ip === "127.0.0.1" ||
    context.ip === "::1" ||
    context.ip.startsWith("::ffff:127.")
  )
) {
  try {
    const { data } = await axios.get(
      "https://api.ipify.org?format=json",
      { timeout: 5000 }
    );

    context.ip = data.ip;
    console.log("[DEV] OTP Public IP:", context.ip);
  } catch (err) {
    console.log("[DEV] Unable to fetch public IP:", err.message);
  }
}

const location = await getGeoLocation(context.ip);

console.log("OTP Location:", location);
    const { accessToken, refreshToken } = await finalizeLogin({ user, req, res, context, location });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/resend-otp
 * Body: { mfaToken }
 * Issues a fresh OTP, invalidating the previous one.
 */
const resendLoginOtp = async (req, res) => {
  try {
    const { mfaToken } = req.body;

    if (!mfaToken) {
      return res.status(422).json({ success: false, message: 'mfaToken is required' });
    }

    let decoded;
    try {
      decoded = verifyToken(mfaToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired MFA session. Please log in again.',
      });
    }

    if (decoded.type !== 'mfa_pending') {
      return res.status(400).json({ success: false, message: 'Invalid token type for this operation' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const channel = user.mfaMethod === 'sms' ? 'sms' : 'email';
    const purpose = channel === 'sms' ? 'login_mfa_sms' : 'login_mfa_email';

    await createAndSendOtp({ user, purpose, channel });

    // Issue a fresh mfaToken too, resetting the 10-minute MFA window
    const newMfaToken = signMfaToken({ id: user._id.toString() });

    return res.status(200).json({
      success: true,
      message: `A new verification code has been sent via ${channel}.`,
      data: { mfaToken: newMfaToken },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message,
    });
  }
};


/**
 * POST /api/auth/logout
 * Blacklists the current access token's jti, marks its Session inactive,
 * writes a logout access log entry, and clears auth cookies.
 */
const logout = async (req, res) => {
  try {
    const context = getRequestContext(req);

    if (req.jti) {
      await revokeSessionByJti({
        jti: req.jti,
        userId: req.user._id,
        reason: 'logout',
        context,
      });
    }

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message,
    });
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user.toSafeObject(),
  });
};

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always responds with a generic success message regardless of whether
 * the email exists, to avoid leaking which emails are registered.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(422).json({ success: false, message: 'Email is required' });
    }

    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a verification code has been sent.',
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Do not reveal whether the email exists
      return res.status(200).json(genericResponse);
    }

    try {
      await createAndSendOtp({ user, purpose: 'forgot_password', channel: 'email' });
    } catch (otpError) {
      return res.status(502).json({
        success: false,
        message: 'Failed to send verification code. Please try again shortly.',
        error: otpError.message,
      });
    }

    const resetToken = signPasswordResetToken({ id: user._id.toString(), verified: false });

    return res.status(200).json({
      ...genericResponse,
      data: { resetToken },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process forgot password request',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/verify-reset-otp
 * Body: { resetToken, otp }
 * Confirms the OTP, then re-issues the resetToken with verified:true so
 * the next step (reset-password) can proceed without resubmitting the OTP.
 */
const verifyResetOtp = async (req, res) => {
  try {
    const { resetToken, otp } = req.body;

    if (!resetToken || !otp) {
      return res.status(422).json({ success: false, message: 'resetToken and otp are required' });
    }

    let decoded;
    try {
      decoded = verifyToken(resetToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset session. Please start over.',
      });
    }

    if (decoded.type !== 'password_reset_pending') {
      return res.status(400).json({ success: false, message: 'Invalid token type for this operation' });
    }

    const result = await verifyOtp({
      userId: decoded.id,
      purpose: 'forgot_password',
      submittedOtp: otp,
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
        ...(result.attemptsRemaining !== undefined && { attemptsRemaining: result.attemptsRemaining }),
      });
    }

    const verifiedResetToken = signPasswordResetToken({ id: decoded.id, verified: true });

    return res.status(200).json({
      success: true,
      message: 'Code verified. You may now reset your password.',
      data: { resetToken: verifiedResetToken },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { resetToken, newPassword }
 * Only succeeds if resetToken carries verified:true from the previous step.
 */
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(422).json({ success: false, message: 'resetToken and newPassword are required' });
    }

    let decoded;
    try {
      decoded = verifyToken(resetToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset session. Please start over.',
      });
    }

    if (decoded.type !== 'password_reset_pending' || decoded.verified !== true) {
      return res.status(403).json({
        success: false,
        message: 'OTP verification is required before resetting your password.',
      });
    }

    const passwordCheck = validatePasswordPolicy(newPassword);
    if (!passwordCheck.valid) {
      return res.status(422).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordCheck.errors,
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword; // re-hashed by pre-save hook
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await revokeAllSessions({ userId: user._id, reason: 'password_changed' });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. All active sessions have been logged out. Please log in with your new password.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/mfa/phone/request-otp
 * Protected. Body: { phone }
 * Sends an OTP to the given phone number to verify ownership before
 * it can be used as an SMS MFA channel.
 */
const requestPhoneVerification = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\+?[1-9]\d{7,14}$/.test(phone)) {
      return res.status(422).json({
        success: false,
        message: 'A valid phone number in E.164 format is required (e.g. +14155552671).',
      });
    }

    const user = req.user;
    user.phone = phone;
    user.phoneVerified = false;
    await user.save();

    try {
      await createAndSendOtp({ user, purpose: 'phone_verification', channel: 'sms' });
    } catch (otpError) {
      return res.status(502).json({
        success: false,
        message: 'Failed to send verification code via SMS.',
        error: otpError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A verification code has been sent to your phone via SMS.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send phone verification OTP',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/mfa/phone/confirm-otp
 * Protected. Body: { otp }
 * Confirms phone ownership and marks the phone as verified.
 */
const confirmPhoneVerification = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(422).json({ success: false, message: 'otp is required' });
    }

    const result = await verifyOtp({
      userId: req.user._id,
      purpose: 'phone_verification',
      submittedOtp: otp,
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
        ...(result.attemptsRemaining !== undefined && { attemptsRemaining: result.attemptsRemaining }),
      });
    }

    req.user.phoneVerified = true;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Phone number verified successfully. You can now enable SMS MFA.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Phone verification failed',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/auth/mfa/method
 * Protected. Body: { method: "email" | "sms" }
 * Switches the user's preferred MFA channel for future logins.
 */
const setMfaMethod = async (req, res) => {
  try {
    const { method } = req.body;

    if (!['email', 'sms'].includes(method)) {
      return res.status(422).json({ success: false, message: 'method must be "email" or "sms"' });
    }

    if (method === 'sms' && !req.user.phoneVerified) {
      return res.status(409).json({
        success: false,
        message: 'You must verify a phone number before enabling SMS MFA.',
      });
    }

    req.user.mfaMethod = method;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: `MFA method updated to ${method}`,
      data: req.user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update MFA method',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  requestPhoneVerification,
  confirmPhoneVerification,
  setMfaMethod,
  logout,
  getMe,
};
