const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['login', 'logout', 'login_failed'],
      required: true,
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
  },
  { timestamps: true }
);

accessLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AccessLog', accessLogSchema);
