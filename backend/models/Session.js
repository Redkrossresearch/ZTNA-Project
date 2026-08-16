const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
    },
    device: { type: String, default: 'Unknown' },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    ip: { type: String, default: 'Unknown' },
    location: {
      country: { type: String, default: null },
      state: { type: String, default: null },
      city: { type: String, default: null },
    },
    loginAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    isActive: { type: Boolean, default: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, isActive: 1 });
// Auto-purge session records well after token expiry (housekeeping safety net)
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('Session', sessionSchema);
