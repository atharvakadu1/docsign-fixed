// routes/audit.js
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');

// My audit logs
router.get('/me', protect, async (req, res) => {
  try {
    const logs = await AuditLog.find({ userId: req.user._id })
      .populate('docId', 'title')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
