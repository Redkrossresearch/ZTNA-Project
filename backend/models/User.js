const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },

    // ---- Security / Auth bookkeeping (used in later phases too) ----
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginCountry: {
      type: String,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },

    // ---- MFA fields ----
    isMfaEnabled: {
      type: Boolean,
      default: true,
    },
    mfaMethod: {
      type: String,
      enum: ['email', 'sms'],
      default: 'email',
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    knownDevices: {
      type: [String],
      default: [],
    },
    knownBrowsers: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// ---------- Hash password before save ----------
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
  next();
});

// ---------- Instance method: compare password ----------
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ---------- Instance method: check if account is locked ----------
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// ---------- Strip sensitive fields when converting to JSON ----------
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
