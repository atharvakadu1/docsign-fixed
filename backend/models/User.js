// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const credentialSchema = new mongoose.Schema({
  credentialID:        { type: String, required: true },
  credentialPublicKey: { type: String, required: true }, // base64url
  counter:             { type: Number, required: true, default: 0 },
  deviceType:          { type: String },
  backedUp:            { type: Boolean, default: false },
  transports:          [{ type: String }],
  deviceName:          { type: String, default: 'Unknown device' },
  registeredAt:        { type: Date, default: Date.now },
}, { _id: false });

const loginHistorySchema = new mongoose.Schema({
  ip:        String,
  userAgent: String,
  status:    { type: String, enum: ['success', 'failed', 'suspicious'] },
  timestamp: { type: Date, default: Date.now },
  flags:     [String],
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin', 'signer', 'viewer'], default: 'signer' },
  avatar:   { type: String }, // initials color

  // WebAuthn biometric credentials (one per device)
  webauthnCredentials:  { type: [credentialSchema], default: [] },
  webauthnChallenge:    { type: String }, // temp challenge during registration/auth
  biometricEnabled:     { type: Boolean, default: false },

  // Fraud detection
  lastLoginIP:   { type: String },
  lastLoginAt:   { type: Date },
  knownIPs:      [{ type: String }],
  knownDevices:  [{ ua: String, ip: String, firstSeen: Date }],
  loginHistory:  { type: [loginHistorySchema], default: [] },
  failedAttempts: { type: Number, default: 0 },
  lockedUntil:   { type: Date },

  isActive:      { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove sensitive fields from JSON
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.webauthnChallenge;
  delete obj.__v;
  return obj;
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

module.exports = mongoose.model('User', userSchema);
