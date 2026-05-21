// routes/documents.js
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const fs      = require('fs');

const Document         = require('../models/Document');
const SignatureRequest  = require('../models/SignatureRequest');
const User             = require('../models/User');
const AuditLog         = require('../models/AuditLog');

const { protect, getClientInfo }          = require('../middleware/auth');
const { hashFile, extendChain }           = require('../services/hashService');
const { generateDocumentQR }              = require('../services/qrService');
const { addBlock, initChain }             = require('../services/blockchainService');

// ── Multer storage ────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename:    (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits:     { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed'));
  },
});

// ── POST /upload ──────────────────────────────────────────
router.post('/upload', protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { title, description, signerIds, signatureType, threshold } = req.body;
    const parsedSignerIds = JSON.parse(signerIds || '[]');

    // Compute SHA-256 of raw file
    const fileHash = await hashFile(req.file.path);

    // Build initial hash chain entry
    const hashChain = [{
      hash:        fileHash,
      signerEmail: req.user.email,
      signerName:  req.user.name,
      note:        'Document uploaded',
      createdAt:   new Date(),
    }];

    // Create document record
    const doc = await Document.create({
      title:        title || req.file.originalname,
      description:  description || '',
      authorId:     req.user._id,
      fileName:     req.file.originalname,
      filePath:     req.file.path,
      fileSize:     req.file.size,
      originalHash: fileHash,
      currentHash:  fileHash,
      hashChain,
      signatureConfig: {
        type:      signatureType || 'all',
        threshold: parseInt(threshold) || parsedSignerIds.length || 1,
      },
      status:    parsedSignerIds.length > 0 ? 'pending' : 'draft',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Generate QR code
    const { dataUrl, url } = await generateDocumentQR(doc._id.toString());
    doc.qrCodeBase64 = dataUrl;
    doc.verifyUrl    = url;
    await doc.save();

    // Ensure blockchain is initialized, then add upload block
    await initChain();
    await addBlock({
      docId:      doc._id,
      docHash:    fileHash,
      signer:     req.user.email,
      signerName: req.user.name,
      signerId:   req.user._id,
      action:     'uploaded',
      metadata:   { title: doc.title, fileName: doc.fileName, fileSize: doc.fileSize },
    });

    // Create signature requests for each signer
    if (parsedSignerIds.length > 0) {
      const signerUsers = await User.find({ _id: { $in: parsedSignerIds } });
      const requests = signerUsers.map((signer, idx) => ({
        docId:     doc._id,
        signerId:  signer._id,
        order:     idx,
        expiresAt: doc.expiresAt,
        notifiedAt: new Date(),
      }));
      await SignatureRequest.insertMany(requests);
    }

    // Audit log
    const { ip, userAgent } = getClientInfo(req);
    await AuditLog.record({
      docId:  doc._id, userId: req.user._id,
      action: 'document_uploaded',
      description: `Document "${doc.title}" uploaded and hashed`,
      metadata: { hash: fileHash, signerCount: parsedSignerIds.length },
      ip, userAgent,
    });

    res.status(201).json({
      success: true,
      document: doc,
      hash: fileHash,
      message: 'Document uploaded, hashed, and added to blockchain',
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /my — documents I authored ───────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const docs = await Document.find({ authorId: req.user._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate('authorId', 'name email')
      .lean();

    // Attach signature counts
    const docIds = docs.map((d) => d._id);
    const allRequests = await SignatureRequest.find({ docId: { $in: docIds } }).lean();

    const enriched = docs.map((doc) => {
      const reqs = allRequests.filter((r) => r.docId.toString() === doc._id.toString());
      return {
        ...doc,
        totalSigners: reqs.length,
        signedCount:  reqs.filter((r) => r.status === 'signed').length,
        pendingCount: reqs.filter((r) => r.status === 'pending').length,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /pending — requests waiting for my signature ─────
router.get('/pending', protect, async (req, res) => {
  try {
    const requests = await SignatureRequest.find({
      signerId: req.user._id,
      status:   { $in: ['pending', 'viewed'] },
    })
      .populate({
        path:     'docId',
        populate: { path: 'authorId', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id — single document detail ────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('authorId', 'name email')
      .lean();

    if (!doc || doc.isDeleted) return res.status(404).json({ error: 'Document not found' });

    const requests = await SignatureRequest.find({ docId: doc._id })
      .populate('signerId', 'name email biometricEnabled')
      .lean();

    // Mark request as viewed if I'm a signer
    const myRequest = requests.find((r) => r.signerId?._id?.toString() === req.user._id.toString());
    if (myRequest && myRequest.status === 'pending') {
      await SignatureRequest.findByIdAndUpdate(myRequest._id, { status: 'viewed', viewedAt: new Date() });
      const { ip, userAgent } = getClientInfo(req);
      await AuditLog.record({ docId: doc._id, userId: req.user._id, action: 'request_viewed', description: 'Signer viewed document', ip, userAgent });
    }

    res.json({ document: doc, signatureRequests: requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id/audit — audit trail ─────────────────────────
router.get('/:id/audit', protect, async (req, res) => {
  try {
    const logs = await AuditLog.find({ docId: req.params.id })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 })
      .lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id — soft delete ─────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the author can delete this document' });
    }
    await doc.softDelete();
    await AuditLog.record({ docId: doc._id, userId: req.user._id, action: 'document_deleted', description: 'Document deleted by author' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id/view — stream PDF for in-browser viewing ─────
router.get('/:id/view', protect, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc || doc.isDeleted) return res.status(404).json({ error: 'Document not found' });

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    fs.createReadStream(doc.filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id/download — download PDF with signed stamp ────
router.get('/:id/download', protect, async (req, res) => {
  try {
    const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

    const doc = await Document.findById(req.params.id).lean();
    if (!doc || doc.isDeleted) return res.status(404).json({ error: 'Document not found' });

    if (!fs.existsSync(doc.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    const requests = await SignatureRequest.find({ docId: doc._id })
      .populate('signerId', 'name email')
      .lean();

    const signedRequests = requests.filter(r => r.status === 'signed');

    // Read and modify PDF
    const pdfBytes = fs.readFileSync(doc.filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    if (pages.length > 0) {
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Draw signed stamp on every page in the bottom-right corner
      for (const page of pages) {
        const { width, height } = page.getSize();

        const stampWidth  = 200;
        const stampHeight = signedRequests.length > 0 ? 28 + signedRequests.length * 14 + 14 : 56;
        const margin = 12;
        const x = width - stampWidth - margin;
        const y = margin;

        // Background box
        page.drawRectangle({
          x, y,
          width: stampWidth,
          height: stampHeight,
          color: rgb(0.94, 1.0, 0.95),
          borderColor: rgb(0.18, 0.72, 0.42),
          borderWidth: 1.5,
          opacity: 0.92,
        });

        // Header row  (✓ is not in WinAnsi; use ASCII-safe label)
        page.drawText('[*] SIGNED - DocSign', {
          x: x + 8,
          y: y + stampHeight - 18,
          size: 9,
          font: helveticaBold,
          color: rgb(0.07, 0.53, 0.27),
        });

        // Divider line
        page.drawLine({
          start: { x: x + 4, y: y + stampHeight - 22 },
          end:   { x: x + stampWidth - 4, y: y + stampHeight - 22 },
          thickness: 0.5,
          color: rgb(0.18, 0.72, 0.42),
          opacity: 0.5,
        });

        if (signedRequests.length > 0) {
          signedRequests.forEach((req, i) => {
            const signerName = req.signerId?.name || 'Unknown';
            const signerEmail = req.signerId?.email || '';
            const signedDate = req.signedAt
              ? new Date(req.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : '';
            const lineY = y + stampHeight - 34 - i * 14;
            page.drawText(`${signerName}  ${signedDate}`, {
              x: x + 8,
              y: lineY,
              size: 7.5,
              font: helveticaBold,
              color: rgb(0.1, 0.35, 0.2),
            });
            if (signerEmail) {
              page.drawText(signerEmail, {
                x: x + 8,
                y: lineY - 8,
                size: 6.5,
                font: helvetica,
                color: rgb(0.3, 0.5, 0.38),
              });
            }
          });
        } else {
          page.drawText('No signatures yet', {
            x: x + 8,
            y: y + stampHeight - 36,
            size: 7.5,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5),
          });
        }

        // Hash snippet at bottom
        const hashSnip = doc.currentHash ? doc.currentHash.slice(0, 24) + '...' : '';
        page.drawText(`Hash: ${hashSnip}`, {
          x: x + 8,
          y: y + 4,
          size: 5.5,
          font: helvetica,
          color: rgb(0.4, 0.6, 0.48),
        });
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    const downloadName = `${doc.title.replace(/[^a-z0-9]/gi, '_')}_signed.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Length', modifiedPdfBytes.length);
    res.end(Buffer.from(modifiedPdfBytes));
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
