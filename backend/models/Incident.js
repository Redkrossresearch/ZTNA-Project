const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      // Which subsystem raised this incident — useful once Risk Engine /
      // Threat Intel / Device Fingerprinting (later phases) start creating
      // incidents automatically alongside manual admin-created ones.
      type: String,
      enum: ['manual', 'system', 'risk_engine', 'threat_intelligence', 'device_fingerprint', 'geo_location', 'mfa_failure'],
      default: 'manual',
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
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

incidentSchema.index({ userId: 1, createdAt: -1 });
incidentSchema.index({ severity: 1, status: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
