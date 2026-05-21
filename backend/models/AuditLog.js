// models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  docId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  action: {
    type: String,
    required: true,
    enum: [
      'document_created', 'document_uploaded', 'document_viewed',
      'document_deleted', 'document_expired',
      'request_sent', 'request_viewed', 'request_expired',
      'signing_started', 'signing_completed', 'signing_rejected',
      'biometric_registered', 'biometric_auth_started',
      'biometric_auth_success', 'biometric_auth_failed',
      'hash_verified', 'hash_mismatch',
      'blockchain_block_added', 'blockchain_verified',
      'qr_scanned', 'verification_accessed',
      'login_success', 'login_failed', 'logout',
      'suspicious_activity', 'account_locked',
    ],
  },

  // Human readable description
  description: { type: String },

  // Technical metadata
  metadata:    { type: mongoose.Schema.Types.Mixed },
  ipAddress:   { type: String },
  userAgent:   { type: String },

  // Fraud flags
  isSuspicious:   { type: Boolean, default: false },
  suspicionFlags: [{ type: String }],
  riskScore:      { type: Number, default: 0 },
}, { timestamps: true });

// Static helper
auditLogSchema.statics.record = function (data) {
  return this.create({
    ...data,
    createdAt: new Date(),
  });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
