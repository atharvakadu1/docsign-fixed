// routes/auth.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, generateToken, getClientInfo } = require('../middleware/auth');
const { analyzeRisk, updateUserDeviceInfo } = require('../services/fraudService');
const {
  generateRegOptions, verifyRegResponse,
  generateAuthOptions, verifyAuthResponse,
} = require('../services/webauthnService');

// ── Register ──────────────────────────────────────────────
router.post('/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

      const { name, email, password, role } = req.body;

      if (await User.findOne({ email })) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const user = await User.create({ name, email, password, role: role || 'signer' });
      const token = generateToken(user._id);

      const { ip, userAgent } = getClientInfo(req);
      await AuditLog.record({ userId: user._id, action: 'login_success', description: 'Account created', ip, userAgent });

      res.status(201).json({ token, user: user.toSafeJSON(), message: 'Account created successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Login ─────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: 'Valid email and password required' });

      const { email, password } = req.body;
      const { ip, userAgent } = getClientInfo(req);

      const user = await User.findOne({ email });

      // Generic error — don't reveal if email exists
      if (!user || !(await user.comparePassword(password))) {
        if (user) {
          user.failedAttempts = (user.failedAttempts || 0) + 1;
          if (user.failedAttempts >= 5) {
            user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
          }
          await user.save();
          await AuditLog.record({ userId: user._id, action: 'login_failed', ip, userAgent });
        }
        return res.status(401).json({ error: 'Incorrect email or password.' });
      }

      if (user.isLocked()) {
        return res.status(403).json({ error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' });
      }

      // Fraud analysis
      const risk = await analyzeRisk(user, { ip, userAgent });

      if (risk.action === 'block') {
        await AuditLog.record({
          userId: user._id, action: 'suspicious_activity',
          description: 'Login blocked — high risk score',
          isSuspicious: true, suspicionFlags: risk.flags, riskScore: risk.score,
          ip, userAgent,
        });
        return res.status(403).json({
          error: 'Login blocked due to suspicious activity.',
          flags: risk.flags,
          riskScore: risk.score,
        });
      }

      // Success — reset failed attempts, update device info
      user.failedAttempts = 0;
      user.lockedUntil = undefined;
      updateUserDeviceInfo(user, { ip, userAgent });
      user.loginHistory.push({ ip, userAgent, status: risk.isSuspicious ? 'suspicious' : 'success', flags: risk.flags });
      if (user.loginHistory.length > 50) user.loginHistory = user.loginHistory.slice(-50);
      await user.save();

      await AuditLog.record({
        userId: user._id, action: 'login_success',
        description: 'User logged in',
        isSuspicious: risk.isSuspicious, suspicionFlags: risk.flags, riskScore: risk.score,
        ip, userAgent,
      });

      const token = generateToken(user._id);
      res.json({
        token,
        user: user.toSafeJSON(),
        warning: risk.isSuspicious ? { flags: risk.flags, riskScore: risk.score } : null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Get current user ──────────────────────────────────────
router.get('/me', protect, (req, res) => res.json(req.user.toSafeJSON()));

// ── All users (for selecting signers) ────────────────────
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ isActive: true, _id: { $ne: req.user._id } })
      .select('name email role biometricEnabled')
      .lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// WebAuthn Routes
// ═══════════════════════════════════════════════════════════

// Start biometric registration
router.get('/webauthn/register/options', protect, async (req, res) => {
  try {
    const options = await generateRegOptions(req.user);
    // Store challenge in DB temporarily
    req.user.webauthnChallenge = options.challenge;
    await req.user.save();
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete biometric registration
router.post('/webauthn/register/verify', protect, async (req, res) => {
  try {
    const challenge = req.user.webauthnChallenge;
    if (!challenge) return res.status(400).json({ error: 'No pending challenge. Start registration first.' });

    const result = await verifyRegResponse(req.user, req.body, challenge);

    req.user.webauthnChallenge = undefined;
    await req.user.save();

    const { ip, userAgent } = getClientInfo(req);
    await AuditLog.record({ userId: req.user._id, action: 'biometric_registered', description: `Biometric registered on ${result.deviceName}`, ip, userAgent });

    res.json({ success: true, message: 'Biometric registered successfully', deviceName: result.deviceName });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start biometric authentication (before signing)
router.get('/webauthn/auth/options', protect, async (req, res) => {
  try {
    const options = await generateAuthOptions(req.user);
    req.user.webauthnChallenge = options.challenge;
    await req.user.save();
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete biometric authentication
router.post('/webauthn/auth/verify', protect, async (req, res) => {
  try {
    const challenge = req.user.webauthnChallenge;
    if (!challenge) return res.status(400).json({ error: 'No pending challenge. Start authentication first.' });

    const result = await verifyAuthResponse(req.user, req.body, challenge);

    req.user.webauthnChallenge = undefined;
    await req.user.save();

    const { ip, userAgent } = getClientInfo(req);
    await AuditLog.record({ userId: req.user._id, action: 'biometric_auth_success', description: `Biometric verified on ${result.deviceName}`, ip, userAgent });

    res.json({ success: true, verified: true, deviceName: result.deviceName });
  } catch (err) {
    const { ip, userAgent } = getClientInfo(req);
    await AuditLog.record({ userId: req.user?._id, action: 'biometric_auth_failed', description: err.message, ip, userAgent }).catch(() => {});
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
