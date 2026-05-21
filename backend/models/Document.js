// models/Document.js
const mongoose = require('mongoose');

const hashChainEntrySchema = new mongoose.Schema({
  hash:      { type: String, required: true },
  signerEmail: String,
  signerName:  String,
  createdAt: { type: Date, default: Date.now },
  note:      String,
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 1000 },
  authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // File metadata
  fileName:    { type: String, required: true },
  filePath:    { type: String, required: true },
  fileSize:    { type: Number },
  mimeType:    { type: String, default: 'application/pdf' },

  // Integrity layer
  originalHash:  { type: String, required: true }, // SHA-256 of the raw file, never changes
  currentHash:   { type: String, required: true }, // latest chain hash
  hashAlgorithm: { type: String, default: 'SHA-256' },
  hashChain:     { type: [hashChainEntrySchema], default: [] }, // full history

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'partially_signed', 'completed', 'rejected', 'expired'],
    default: 'draft',
  },

  // Signature config
  signatureConfig: {
    type:      { type: String, enum: ['all', 'threshold'], default: 'all' },
    threshold: { type: Number, default: 1 },
    ordered:   { type: Boolean, default: false }, // sequential signing
  },

  // QR
  qrCodeBase64: { type: String },
  verifyUrl:    { type: String },

  // Expiry
  expiresAt:  { type: Date },
  isDeleted:  { type: Boolean, default: false },
  deletedAt:  { type: Date },
}, { timestamps: true });

// Virtual: is fully signed
documentSchema.virtual('isComplete').get(function () {
  // resolved in controller based on signature counts
  return this.status === 'completed';
});

documentSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Document', documentSchema);
