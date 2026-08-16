const express = require('express');
const rateLimit = require('express-rate-limit');

const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  handleValidationErrors,
  registerValidationRules,
  loginValidationRules,
} = require('../middleware/validators');

const router = express.Router();

// Stricter limiter specifically for login to slow down brute-force attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// Limiter for OTP resend to prevent email-bombing
const otpResendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP resend requests. Please wait before trying again.' },
});

// Limiter for OTP verification attempts (separate from the resend limiter)
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP verification attempts. Please try again later.' },
});

// Limiter for forgot-password requests (prevents email-bombing via this endpoint too)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Please try again later.' },
});

router.post('/register', registerValidationRules, handleValidationErrors, register);
router.post('/login', loginLimiter, loginValidationRules, handleValidationErrors, login);
router.post('/verify-otp', otpVerifyLimiter, verifyLoginOtp);
router.post('/resend-otp', otpResendLimiter, resendLoginOtp);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/verify-reset-otp', otpVerifyLimiter, verifyResetOtp);
router.post('/reset-password', resetPassword);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// ---- SMS MFA setup (account settings, requires being logged in) ----
router.post('/mfa/phone/request-otp', protect, otpResendLimiter, requestPhoneVerification);
router.post('/mfa/phone/confirm-otp', protect, otpVerifyLimiter, confirmPhoneVerification);
router.patch('/mfa/method', protect, setMfaMethod);

module.exports = router;
