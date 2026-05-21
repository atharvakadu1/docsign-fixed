// models/BlockchainBlock.js
const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  index:        { type: Number, required: true },
  docId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  docHash:      { type: String, required: true },
  signer:       { type: String, required: true },
  signerName:   { type: String },
  signerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:       { type: String, required: true }, // 'genesis' | 'uploaded' | 'signed' | 'verified'
  previousHash: { type: String, required: true },
  currentHash:  { type: String, required: true },
  nonce:        { type: Number, default: 0 },
  timestamp:    { type: Date, default: Date.now },
  metadata:     { type: mongoose.Schema.Types.Mixed },
}, { timestamps: false });

// Compound index for fast per-document lookups
blockSchema.index({ docId: 1, index: 1 });
blockSchema.index({ index: 1 }, { unique: true });

module.exports = mongoose.model('BlockchainBlock', blockSchema);
