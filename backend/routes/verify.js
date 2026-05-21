// routes/verify.js
const express = require('express');
const router = express.Router();

const Document        = require('../models/Document');
const SignatureRequest = require('../models/SignatureRequest');
const AuditLog        = require('../models/AuditLog');
const { verifyFileIntegrity, verifyHashChain } = require('../services/hashService');
const { verifyDocumentChain }                  = require('../services/blockchainService');
const { getClientInfo }                        = require('../middleware/auth');

// ── GET /:docId — public verification endpoint ────────────
router.get('/:docId', async (req, res) => {
  try {
    const { ip, userAgent } = getClientInfo(req);

    const doc = await Document.findById(req.params.docId)
      .populate('authorId', 'name email')
      .lean();

    if (!doc || doc.isDeleted) {
      return res.status(404).json({ error: 'Document not found or has been deleted' });
    }

    // 1. File integrity check (SHA-256)
    const integrityResult = await verifyFileIntegrity(doc.filePath, doc.originalHash);

    // 2. Hash chain verification
    const chainResult = verifyHashChain(doc.hashChain);

    // 3. Blockchain verification for this document
    const blockchainResult = await verifyDocumentChain(doc._id);

    // 4. Signature requests
    const requests = await SignatureRequest.find({ docId: doc._id })
      .populate('signerId', 'name email')
      .lean();

    // Log QR scan / verify access
    await AuditLog.record({
      docId:  doc._id,
      action: 'verification_accessed',
      description: 'Document verification accessed',
      metadata: { public: true },
      ip, userAgent,
    });

    res.json({
      document: {
        id:           doc._id,
        title:        doc.title,
        description:  doc.description,
        status:       doc.status,
        author:       doc.authorId,
        fileName:     doc.fileName,
        fileSize:     doc.fileSize,
        createdAt:    doc.createdAt,
        expiresAt:    doc.expiresAt,
        signatureConfig: doc.signatureConfig,
        hashAlgorithm: doc.hashAlgorithm,
      },

      integrity: {
        originalHash:   doc.originalHash,
        currentHash:    doc.currentHash,
        fileVerified:   integrityResult.verified,
        fileMessage:    integrityResult.message,
        hashChainValid: chainResult.valid,
        hashChainMessage: chainResult.message,
        hashChainSteps: chainResult.steps || [],
      },

      signatures: requests.map((r) => ({
        signerName:  r.signerId?.name || 'Unknown',
        signerEmail: r.signerId?.email || 'Unknown',
        status:      r.status,
        signedAt:    r.signedAt,
        authMethod:  r.authMethod,
        deviceName:  r.biometricDevice,
        signatureHash: r.signatureHash,
      })),

      blockchain: blockchainResult,

      summary: {
        totalSigners:  requests.length,
        signedCount:   requests.filter((r) => r.status === 'signed').length,
        pendingCount:  requests.filter((r) => r.status === 'pending').length,
        rejectedCount: requests.filter((r) => r.status === 'rejected').length,
        allVerified:   integrityResult.verified && chainResult.valid,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
