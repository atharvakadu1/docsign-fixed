// routes/signatures.js
const express = require('express');
const router = express.Router();

const SignatureRequest = require('../models/SignatureRequest');
const Document        = require('../models/Document');
const AuditLog        = require('../models/AuditLog');
const { protect, getClientInfo } = require('../middleware/auth');
const { extendChain }            = require('../services/hashService');
const { addBlock }               = require('../services/blockchainService');

// ── POST /:requestId/sign ─────────────────────────────────
router.post('/:requestId/sign', protect, async (req, res) => {
  try {
    const { authMethod = 'biometric', biometricVerified = false } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    // Load request
    const request = await SignatureRequest.findById(req.params.requestId);
    if (!request)                       return res.status(404).json({ error: 'Signature request not found' });
    if (request.signerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to sign this request' });
    }
    if (request.status === 'signed')    return res.status(400).json({ error: 'Already signed' });
    if (request.status === 'rejected')  return res.status(400).json({ error: 'Request was rejected' });
    if (request.status === 'expired')   return res.status(400).json({ error: 'Request has expired' });

    // Biometric must be verified before signing
    if (authMethod === 'biometric' && !biometricVerified) {
      return res.status(401).json({ error: 'Complete biometric verification before signing' });
    }

    // Load document
    const doc = await Document.findById(request.docId);
    if (!doc || doc.isDeleted) return res.status(404).json({ error: 'Document not found' });
    if (doc.status === 'completed') return res.status(400).json({ error: 'Document is already fully signed' });

    // ── Hash chain extension ───────────────────────────────
    // New chain hash = SHA256(previousChainHash + signerEmail)
    const prevHash    = doc.currentHash;
    const newChainHash = extendChain(prevHash, req.user.email);

    // Append to hash chain history
    doc.hashChain.push({
      hash:        newChainHash,
      signerEmail: req.user.email,
      signerName:  req.user.name,
      note:        `Signed by ${req.user.name}`,
      createdAt:   new Date(),
    });
    doc.currentHash = newChainHash;

    // ── Update signature request ───────────────────────────
    request.status          = 'signed';
    request.signedAt        = new Date();
    request.authMethod      = authMethod;
    request.signatureHash   = newChainHash;
    request.hashChainIndex  = doc.hashChain.length - 1;
    request.biometricDevice = req.body.deviceName || 'Unknown device';
    request.ipAddress       = ip;
    request.userAgent       = userAgent;

    // ── Check if document is now fully signed ──────────────
    const allRequests = await SignatureRequest.find({ docId: doc._id });
    const signedCount = allRequests.filter((r) =>
      r._id.toString() === request._id.toString() ? true : r.status === 'signed'
    ).length;

    let isComplete = false;
    if (doc.signatureConfig.type === 'all') {
      isComplete = signedCount === allRequests.length;
    } else {
      isComplete = signedCount >= doc.signatureConfig.threshold;
    }

    doc.status = isComplete ? 'completed' : 'partially_signed';

    // ── Add blockchain block ───────────────────────────────
    const block = await addBlock({
      docId:      doc._id,
      docHash:    newChainHash,
      signer:     req.user.email,
      signerName: req.user.name,
      signerId:   req.user._id,
      action:     'signed',
      metadata: {
        authMethod,
        requestId:      request._id.toString(),
        signedCount,
        totalSigners:   allRequests.length,
        documentComplete: isComplete,
      },
    });

    // Save both
    await Promise.all([doc.save(), request.save()]);

    // ── Audit log ──────────────────────────────────────────
    await AuditLog.record({
      docId:  doc._id, userId: req.user._id,
      action: 'signing_completed',
      description: `${req.user.name} signed "${doc.title}" using ${authMethod}`,
      metadata: {
        authMethod, blockIndex: block.index, newHash: newChainHash,
        documentComplete: isComplete, signedCount, totalSigners: allRequests.length,
      },
      ip, userAgent,
    });

    res.json({
      success:   true,
      message:   isComplete ? '🎉 Document fully signed!' : 'Signature recorded successfully',
      status:    doc.status,
      newHash:   newChainHash,
      blockIndex: block.index,
      signedCount,
      totalSigners: allRequests.length,
      isComplete,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /:requestId/reject ───────────────────────────────
router.post('/:requestId/reject', protect, async (req, res) => {
  try {
    const { reason = 'No reason provided' } = req.body;
    const { ip, userAgent } = getClientInfo(req);

    const request = await SignatureRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.signerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (['signed', 'rejected'].includes(request.status)) {
      return res.status(400).json({ error: `Cannot reject a ${request.status} request` });
    }

    request.status          = 'rejected';
    request.rejectedAt      = new Date();
    request.rejectionReason = reason;
    await request.save();

    await AuditLog.record({
      docId: request.docId, userId: req.user._id,
      action: 'signing_rejected',
      description: `${req.user.name} rejected the signature request. Reason: ${reason}`,
      metadata: { reason }, ip, userAgent,
    });

    res.json({ success: true, message: 'Signature request rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
