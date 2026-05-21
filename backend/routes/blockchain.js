// routes/blockchain.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { verifyChain, getFullChain, getDocumentBlocks } = require('../services/blockchainService');
const BlockchainBlock = require('../models/BlockchainBlock');

// Full chain stats
router.get('/stats', protect, async (req, res) => {
  try {
    const total = await BlockchainBlock.countDocuments();
    const latest = await BlockchainBlock.findOne().sort({ index: -1 }).lean();
    const docBlocks = await BlockchainBlock.countDocuments({ action: 'signed' });
    res.json({ totalBlocks: total, latestIndex: latest?.index ?? 0, signatureBlocks: docBlocks, latestHash: latest?.currentHash });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Verify chain integrity
router.get('/verify', protect, async (req, res) => {
  try { res.json(await verifyChain()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Full chain (paginated)
router.get('/chain', protect, async (req, res) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;
    const total = await BlockchainBlock.countDocuments();
    const blocks = await BlockchainBlock.find().sort({ index: -1 }).skip(skip).limit(limit)
      .populate('docId', 'title').lean();
    res.json({ blocks, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Blocks for a document
router.get('/document/:docId', protect, async (req, res) => {
  try { res.json(await getDocumentBlocks(req.params.docId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
