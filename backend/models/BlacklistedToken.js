const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: ['logout', 'admin_revoked', 'password_changed', 'security'],
      default: 'logout',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Once the original token would have expired anyway, the blacklist entry
// is useless — TTL index removes it automatically to keep the collection lean.
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema);
