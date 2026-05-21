// models/SignatureRequest.js
const mongoose = require('mongoose');

const signatureRequestSchema = new mongoose.Schema({
  docId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  status: {
    type: String,
    enum: ['pending', 'viewed', 'signed', 'rejected', 'expired'],
    default: 'pending',
  },

  order: { type: Number, default: 0 }, // for sequential signing

  // Signing details
  signedAt:        { type: Date },
  signatureHash:   { type: String }, // hash at time of signing
  hashChainIndex:  { type: Number }, // which position in the hash chain
  authMethod:      { type: String, enum: ['biometric', 'password'], default: 'password' },
  biometricDevice: { type: String }, // device name used for biometric

  // Rejection
  rejectedAt:      { type: Date },
  rejectionReason: { type: String },

  // Tracking
  viewedAt:   { type: Date },
  ipAddress:  { type: String },
  userAgent:  { type: String },

  // Notification
  notifiedAt:   { type: Date },
  reminderCount: { type: Number, default: 0 },

  expiresAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SignatureRequest', signatureRequestSchema);
