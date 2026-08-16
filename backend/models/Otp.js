const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['login_mfa_email', 'login_mfa_sms', 'forgot_password', 'phone_verification'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'sms'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB automatically deletes the document once expiresAt passes.
// This is a hard cleanup safety net; application logic also explicitly checks expiry.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ userId: 1, purpose: 1 });

module.exports = mongoose.model('Otp', otpSchema);
